// The Hourglass — falling blocks that crumble into sand.
//
// Pieces fall like Tetris pieces, but the moment one lands it breaks into grains of
// coloured sand that slump and slide. A colour clears when its sand reaches from the
// left wall all the way to the right wall in one unbroken stretch.
//
// The well is a grid of grains (each block is G×G of them). It's drawn one pixel per
// grain and scaled up by the page, so every grain is a little square tessera.

export const G    = 6                  // grains along each side of a block
export const COLS = 10
export const ROWS = 20
export const W    = COLS * G
export const H    = ROWS * G

// Gold, verdigris, rose madder, lapis — four shades each, darkest first
export const PIGMENTS = [
  { name: 'gold',      shades: ['#a8862f', '#c4a144', '#d6b65c', '#e8cd7c'] },
  { name: 'verdigris', shades: ['#25665e', '#2f7d73', '#3c9488', '#52ab9d'] },
  { name: 'rose',      shades: ['#7f2b45', '#9a3855', '#b24a68', '#c9627f'] },
  { name: 'lapis',     shades: ['#2b4677', '#365992', '#4469aa', '#5a80c2'] },
]

export const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
}

const STEP      = 1 / 150   // seconds per step of the sand
const LOCK_MS   = 320       // a piece resting on something can still slide this long
const LOCK_MOVES = 12       // …and be nudged this many times before it settles anyway
const FLASH_MS  = 440       // a cleared stretch glows this long before it goes
const SOFT_DROP = 90        // grains a second while holding down

const fallSpeed = (level) => Math.min(54, 9 + (level - 1) * 3)   // grains a second
const levelFor  = (bridges) => 1 + Math.floor(bridges / 3)

const rotate = (m, dir) => {
  const n = m.length
  return m.map((row, y) => row.map((_, x) => (dir > 0 ? m[n - 1 - x][y] : m[x][n - 1 - y])))
}
const blocksOf = (m) => {
  const out = []
  m.forEach((row, y) => row.forEach((v, x) => { if (v) out.push([x, y]) }))
  return out
}

// colours as 32-bit pixels (the canvas stores them as little-endian ABGR)
const pixel = (hex, alpha = 255) => {
  const n = parseInt(hex.slice(1), 16)
  return ((alpha << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16)) >>> 0
}
const PAL   = PIGMENTS.map((p) => p.shades.map((s) => pixel(s)))
const GHOST = PIGMENTS.map((p) => pixel(p.shades[2], 64))
const FLASH = [pixel('#fff4d2'), pixel('#f3dc93')]

export function createHourglass(canvas, { sound, onScore, onLevel, onBridges, onNext, onOver } = {}) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const px = new Uint32Array(img.data.buffer)

  // each cell: 0 empty, else (pigment + 1) | shade << 3
  const sand     = new Uint8Array(W * H)
  const clearing = new Uint8Array(W * H)
  const seen     = new Uint32Array(W * H)
  const queue    = new Int32Array(W * H)
  let stamp = 0

  let state = 'idle'          // idle | playing | paused | over
  let piece = null            // { shape, m, blocks, pig, x, y } — x, y in grains, top-left of m
  let next  = null
  let bag   = []
  let pieces = 0              // how many have fallen (so a drag knows when its piece has landed)
  let fall = 0, sim = 0, lockAt = 0, lockMoves = 0, soft = false
  let score = 0, bridges = 0, level = 1, chain = 0
  let flashing = null         // the grains being cleared, while they glow
  let flashUntil = 0
  let dirty = false
  let raf = 0, last = 0

  /* ── Pieces ───────────────────────────────────────── */
  const draw7 = () => {
    if (!bag.length) bag = Object.keys(SHAPES).sort(() => Math.random() - 0.5)
    return { shape: bag.pop(), pig: Math.floor(Math.random() * PIGMENTS.length) }
  }

  const collides = (blocks, x, y) => {
    for (const [bx, by] of blocks) {
      const x0 = x + bx * G, y0 = y + by * G
      if (x0 < 0 || x0 + G > W || y0 + G > H) return true
      for (let gy = Math.max(0, y0); gy < y0 + G; gy++) {
        const row = gy * W
        for (let gx = x0; gx < x0 + G; gx++) if (sand[row + gx]) return true
      }
    }
    return false
  }

  const spawn = () => {
    const { shape, pig } = next ?? draw7()
    next = draw7()
    onNext?.(next)
    const m = SHAPES[shape]
    const top = m.findIndex((row) => row.some(Boolean))
    const p = { shape, m, blocks: blocksOf(m), pig, x: Math.floor((COLS - m.length) / 2) * G, y: -top * G }
    fall = 0; lockAt = 0; lockMoves = 0
    if (collides(p.blocks, p.x, p.y)) { piece = null; end(); return }
    piece = p
    pieces++
  }

  // a move or turn that worked: a resting piece gets a little longer to slide
  const nudged = () => {
    if (lockAt && lockMoves < LOCK_MOVES) { lockMoves++; lockAt = performance.now() + LOCK_MS }
  }

  const shift = (dx) => {
    if (!piece || state !== 'playing' || flashing) return false
    if (collides(piece.blocks, piece.x + dx, piece.y)) return false
    piece.x += dx
    nudged()
    return true
  }

  const turn = (dir) => {
    if (!piece || state !== 'playing' || flashing) return
    const m = rotate(piece.m, dir), blocks = blocksOf(m)
    // try in place, then nudged sideways off a wall or a heap, then up a little
    for (const [kx, ky] of [[0, 0], [-G, 0], [G, 0], [-2 * G, 0], [2 * G, 0], [0, -G], [-G, -G], [G, -G]]) {
      if (!collides(blocks, piece.x + kx, piece.y + ky)) {
        Object.assign(piece, { m, blocks, x: piece.x + kx, y: piece.y + ky })
        nudged()
        sound?.turn()
        return
      }
    }
  }

  const landingY = () => {
    let y = piece.y
    while (!collides(piece.blocks, piece.x, y + 1)) y++
    return y
  }

  // The piece breaks into loose sand where it lies
  const land = () => {
    for (const [bx, by] of piece.blocks) {
      const x0 = piece.x + bx * G, y0 = piece.y + by * G
      for (let gy = Math.max(0, y0); gy < y0 + G; gy++) {
        for (let gx = x0; gx < x0 + G; gx++) {
          const r = Math.random()
          const shade = r < 0.2 ? 0 : r < 0.6 ? 1 : r < 0.88 ? 2 : 3
          sand[gy * W + gx] = (piece.pig + 1) | (shade << 3)
        }
      }
    }
    piece = null
    chain = 0
    dirty = true
    sound?.pour()
    spawn()
  }

  const hardDrop = () => {
    if (!piece || state !== 'playing' || flashing) return
    piece.y = landingY()
    land()
  }

  /* ── Sand ─────────────────────────────────────────── */
  // Bottom row up, so a grain moves at most once a step. Rows alternate direction and
  // each grain picks its diagonal at random, so heaps don't lean one way.
  let flip = false
  const stepSand = () => {
    let moved = false
    flip = !flip
    for (let y = H - 2; y >= 0; y--) {
      const ltr = (y & 1) === (flip ? 1 : 0)
      for (let k = 0; k < W; k++) {
        const x = ltr ? k : W - 1 - k
        const i = y * W + x
        const c = sand[i]
        if (!c || clearing[i]) continue
        const below = i + W
        if (!sand[below]) { sand[below] = c; sand[i] = 0; moved = true; continue }
        const first = Math.random() < 0.5 ? -1 : 1
        for (const d of [first, -first]) {
          const nx = x + d
          if (nx < 0 || nx >= W) continue
          if (!sand[below + d] && !sand[i + d]) { sand[below + d] = c; sand[i] = 0; moved = true; break }
        }
      }
    }
    return moved
  }

  // Every stretch of one colour that touches both walls (grains touching edge or corner)
  const findBridges = () => {
    const found = []
    stamp++
    for (let y = 0; y < H; y++) {
      const start = y * W
      const c = sand[start]
      if (!c || seen[start] === stamp) continue
      const pig = c & 7
      let head = 0, tail = 0, across = false
      queue[tail++] = start
      seen[start] = stamp
      while (head < tail) {
        const i = queue[head++]
        const x = i % W, gy = (i - x) / W
        if (x === W - 1) across = true
        for (let dy = -1; dy <= 1; dy++) {
          const ny = gy + dy
          if (ny < 0 || ny >= H) continue
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            if (nx < 0 || nx >= W) continue
            const j = ny * W + nx
            if (seen[j] === stamp || (sand[j] & 7) !== pig) continue
            seen[j] = stamp
            queue[tail++] = j
          }
        }
      }
      if (across) found.push(queue.slice(0, tail))
    }
    return found
  }

  const startClearing = (found, now) => {
    let grains = 0
    for (const cells of found) { for (const i of cells) clearing[i] = 1; grains += cells.length }
    flashing = found
    flashUntil = now + FLASH_MS
    chain += found.length
    bridges += found.length
    const before = level
    level = levelFor(bridges)
    score += grains * level * chain
    onScore?.(score)
    onBridges?.(bridges)
    if (level !== before) onLevel?.(level)
    sound?.bridge(chain)
  }

  const finishClearing = () => {
    for (const cells of flashing) for (const i of cells) { sand[i] = 0; clearing[i] = 0 }
    flashing = null
    dirty = true
  }

  /* ── Loop ─────────────────────────────────────────── */
  const update = (dt, now) => {
    if (flashing) {
      if (now < flashUntil) return          // a beat to see what cleared
      finishClearing()
    }

    sim += dt
    let steps = 0
    while (sim >= STEP && steps < 6) { if (stepSand()) dirty = true; sim -= STEP; steps++ }
    if (steps === 6) sim = 0

    if (dirty) {
      dirty = false
      const found = findBridges()
      if (found.length) { startClearing(found, now); return }
    }

    if (!piece) return
    fall += (soft ? SOFT_DROP : fallSpeed(level)) * dt
    while (fall >= 1) {
      fall -= 1
      if (collides(piece.blocks, piece.x, piece.y + 1)) { fall = 0; break }
      piece.y++
      lockAt = 0
    }
    if (collides(piece.blocks, piece.x, piece.y + 1)) {
      if (!lockAt) lockAt = now + (soft ? 0 : LOCK_MS)
      else if (now >= lockAt) land()
    } else {
      lockAt = 0
    }
  }

  const render = (now) => {
    px.fill(0)
    const flashOn = flashing && Math.floor((flashUntil - now) / 70) % 2 === 0
    for (let i = 0; i < sand.length; i++) {
      const c = sand[i]
      if (!c) continue
      px[i] = clearing[i] && flashOn ? FLASH[i & 1] : PAL[(c & 7) - 1][c >> 3]
    }
    if (piece && state !== 'over') {
      // where it would land, faintly
      const gy = landingY()
      for (const [bx, by] of piece.blocks) {
        const x0 = piece.x + bx * G, y0 = gy + by * G
        for (let y = Math.max(0, y0); y < y0 + G; y++) {
          for (let x = x0; x < x0 + G; x++) if (!sand[y * W + x]) px[y * W + x] = GHOST[piece.pig]
        }
      }
      // the piece itself, as a tile: dark edges, a few bright flecks
      const pal = PAL[piece.pig]
      for (const [bx, by] of piece.blocks) {
        const x0 = piece.x + bx * G, y0 = piece.y + by * G
        for (let gy = 0; gy < G; gy++) {
          const y = y0 + gy
          if (y < 0) continue
          for (let gx = 0; gx < G; gx++) {
            const edge = gx === 0 || gy === 0 || gx === G - 1 || gy === G - 1
            px[y * W + x0 + gx] = pal[edge ? 0 : (gx + gy) % 4 === 1 ? 3 : 2]
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  }

  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (state === 'playing') update(dt, now)
    render(now)
  }
  last = performance.now()
  raf = requestAnimationFrame(frame)

  function end() {
    state = 'over'
    sound?.over()
    onOver?.(score)
  }

  return {
    start() {
      sand.fill(0); clearing.fill(0)
      bag = []; next = null; flashing = null
      score = 0; bridges = 0; level = 1; chain = 0; sim = 0; soft = false
      onScore?.(0); onBridges?.(0); onLevel?.(1)
      state = 'playing'
      spawn()
    },
    pause()  { if (state === 'playing') state = 'paused' },
    resume() { if (state === 'paused') { state = 'playing'; last = performance.now() } },
    left()   { if (shift(-G)) sound?.tick() },
    right()  { if (shift(G)) sound?.tick() },
    // touch: slide the piece to this many grains from the left wall, as far as it fits
    slideTo(x) {
      if (!piece) return
      const dir = Math.sign(x - piece.x)
      while (piece && piece.x !== x && shift(dir)) { /* one grain at a time, until something's in the way */ }
    },
    pieceX: () => piece?.x ?? null,
    pieceId: () => pieces,
    turn,
    softDrop(on) { soft = on },
    hardDrop,
    destroy() { cancelAnimationFrame(raf) },
  }
}
