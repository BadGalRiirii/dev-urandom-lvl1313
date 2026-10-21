// The Hourglass — falling blocks that crumble into sand.
//
// Pieces fall like Tetris pieces, but the moment one lands it breaks into grains of
// coloured sand that slump and slide. A colour clears when its sand reaches from the
// left wall all the way to the right wall in one unbroken stretch.
//
// Two canvases, stacked:
//   sand — the settled grains as a gilded mosaic, one small tile per grain. Only the
//          rows that changed are repainted, so a still heap costs nothing.
//   fx   — everything that moves every frame: the falling piece (stained glass with
//          gold leading), where it will land, glints, dust, the glow of a clear.

export const G    = 6                  // grains along each side of a block
export const COLS = 10
export const ROWS = 20
export const W    = COLS * G
export const H    = ROWS * G

// Gold, jade, rose madder, lapis — four shades each, darkest first
export const PIGMENTS = [
  { name: 'gold',  shades: ['#9e7d2c', '#c19d45', '#d8b75e', '#ecd38a'], glow: '#f3dc93' },
  { name: 'jade',  shades: ['#22625a', '#2d7a70', '#3b9286', '#5bb0a2'], glow: '#8fd8c8' },
  { name: 'rose',  shades: ['#7a2a43', '#973754', '#b04b69', '#cc6a86'], glow: '#f0a3b8' },
  { name: 'lapis', shades: ['#294372', '#34558f', '#4468a8', '#6487c6'], glow: '#a9c2ee' },
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

const STEP       = 1 / 150   // seconds per step of the sand
const LOCK_MS    = 360       // a piece resting on something can still slide this long
const LOCK_MOVES = 12        // …and be nudged this many times before it settles anyway
const SWEEP_MS   = 520       // a clear glows across from wall to wall in this long
const SOFT_DROP  = 90        // grains a second while holding down
const MAX_DUST   = 900

const fallSpeed = (level) => Math.min(54, 8 + (level - 1) * 2.6)   // grains a second
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

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }
const mix = ([r, g, b], k) => (k >= 0
  ? [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k]
  : [r * (1 + k), g * (1 + k), b * (1 + k)])
// a 32-bit pixel (the canvas stores them as little-endian ABGR)
const pixel = ([r, g, b]) => ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0

export function createHourglass({ sandCanvas, fxCanvas }, cb = {}) {
  const { sound } = cb
  const sctx = sandCanvas.getContext('2d')
  const fx   = fxCanvas.getContext('2d')

  // each cell: 0 empty, else (pigment + 1) | shade << 3
  const sand     = new Uint8Array(W * H)
  const clearing = new Uint8Array(W * H)
  const seen     = new Uint32Array(W * H)
  const queue    = new Int32Array(W * H)
  let stamp = 0

  let state = 'idle'          // idle | playing | paused | over
  let piece = null            // { shape, m, blocks, pig, x, y } — x, y in grains, top-left of m
  let next = null, held = null, canHold = true
  let bag = [], pieces = 0
  let fall = 0, sim = 0, lockAt = 0, lockMoves = 0, soft = false
  let score = 0, bridges = 0, level = 1, chain = 0
  let sweep = null            // the clear under way: { found, start, until }
  let dirtyLo = H, dirtyHi = -1
  let raf = 0, last = 0
  let viewX = 0               // where the piece is drawn — glides after the real x

  /* ── Sizes ────────────────────────────────────────── */
  let S = 4                   // sand canvas pixels per grain
  let img = null, px = null
  let tiles = []              // [pigment][shade] → S×S pixels: a tessera with a lit edge and a joint
  let k = 1                   // fx canvas pixels per grain

  const buildTiles = () => {
    tiles = PIGMENTS.map((p) => p.shades.map((hex, shade) => {
      const base = rgb(hex)
      const t = new Uint32Array(S * S)
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          let c = base
          if (S >= 4 && (i === S - 1 || j === S - 1)) c = mix(base, -0.38)        // the joint between tiles
          else if (i === 0 || j === 0) c = mix(base, shade === 3 ? 0.28 : 0.14)   // light catching the edge
          else if (S >= 6 && i === 1 && j === 1 && p.name === 'gold') c = mix(base, 0.35)
          t[j * S + i] = pixel(c)
        }
      }
      return t
    }))
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = fxCanvas.clientWidth || W * 4, ch = fxCanvas.clientHeight || H * 4
    fxCanvas.width = Math.round(cw * dpr)
    fxCanvas.height = Math.round(ch * dpr)
    k = fxCanvas.width / W
    S = Math.max(3, Math.min(8, Math.round(k)))
    sandCanvas.width = W * S
    sandCanvas.height = H * S
    img = sctx.createImageData(W * S, H * S)
    px = new Uint32Array(img.data.buffer)
    buildTiles()
    dirtyLo = 0; dirtyHi = H - 1
  }

  const touchRows = (a, b) => { if (a < dirtyLo) dirtyLo = Math.max(0, a); if (b > dirtyHi) dirtyHi = Math.min(H - 1, b) }

  const paintSand = () => {
    if (dirtyHi < dirtyLo) return
    const IW = W * S
    for (let y = dirtyLo; y <= dirtyHi; y++) {
      for (let x = 0; x < W; x++) {
        const c = sand[y * W + x]
        const tile = c ? tiles[(c & 7) - 1][c >> 3] : null
        for (let ty = 0; ty < S; ty++) {
          const at = (y * S + ty) * IW + x * S
          if (tile) px.set(tile.subarray(ty * S, ty * S + S), at)
          else px.fill(0, at, at + S)
        }
      }
    }
    sctx.putImageData(img, 0, 0, 0, dirtyLo * S, IW, (dirtyHi - dirtyLo + 1) * S)
    dirtyLo = H; dirtyHi = -1
  }

  /* ── Effects ──────────────────────────────────────── */
  const dust = []     // { x, y, vx, vy, life, age, size, color } — in grains
  const glints = []   // { x, y, age, life }
  const streaks = []  // { x, w, y0, y1, age, pig }
  let nextGlint = 0

  const puff = (x, y, color, n, spread = 1, up = 1) => {
    for (let i = 0; i < n && dust.length < MAX_DUST; i++) {
      dust.push({
        x: x + (Math.random() - 0.5) * spread, y,
        vx: (Math.random() - 0.5) * 14 * spread, vy: -(4 + Math.random() * 10) * up,
        age: 0, life: 0.5 + Math.random() * 0.5, size: 0.35 + Math.random() * 0.45, color, rise: false,
      })
    }
  }

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

  const place = ({ shape, pig }) => {
    const m = SHAPES[shape]
    const top = m.findIndex((row) => row.some(Boolean))
    return { shape, m, blocks: blocksOf(m), pig, x: Math.floor((COLS - m.length) / 2) * G, y: -top * G }
  }

  const spawn = (from) => {
    if (!from) { from = next ?? draw7(); next = draw7(); cb.onNext?.(next) }
    const p = place(from)
    fall = 0; lockAt = 0; lockMoves = 0
    if (collides(p.blocks, p.x, p.y)) { piece = null; end(); return }
    piece = p
    viewX = p.x
    pieces++
  }

  // a move or turn that worked: a resting piece gets a little longer to slide
  const nudged = () => {
    if (lockAt && lockMoves < LOCK_MOVES) { lockMoves++; lockAt = performance.now() + LOCK_MS }
  }

  const active = () => piece && state === 'playing' && !sweep

  const shift = (dx) => {
    if (!active() || collides(piece.blocks, piece.x + dx, piece.y)) return false
    piece.x += dx
    nudged()
    return true
  }

  const turn = (dir) => {
    if (!active()) return
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

  const hold = () => {
    if (!active() || !canHold) return
    const was = held
    held = { shape: piece.shape, pig: piece.pig }
    canHold = false
    cb.onHold?.(held)
    sound?.hold()
    spawn(was)    // the one put by, or the next if nothing was
  }

  const landingY = () => {
    let y = piece.y
    while (!collides(piece.blocks, piece.x, y + 1)) y++
    return y
  }

  // The piece breaks into loose sand where it lies
  const land = (dropped = false) => {
    const pal = PIGMENTS[piece.pig]
    let bottom = 0
    for (const [bx, by] of piece.blocks) {
      const x0 = piece.x + bx * G, y0 = piece.y + by * G
      for (let gy = Math.max(0, y0); gy < y0 + G; gy++) {
        for (let gx = x0; gx < x0 + G; gx++) {
          const r = Math.random()
          const shade = r < 0.18 ? 0 : r < 0.58 ? 1 : r < 0.88 ? 2 : 3
          sand[gy * W + gx] = (piece.pig + 1) | (shade << 3)
        }
      }
      touchRows(y0, y0 + G)
      bottom = Math.max(bottom, y0 + G)
      puff(x0 + G / 2, y0 + G, pal.shades[3], dropped ? 7 : 3, G)
    }
    piece = null
    chain = 0
    canHold = true
    sound?.land(dropped)
    cb.onLand?.(dropped)
    spawn()
  }

  const hardDrop = () => {
    if (!active()) return
    const y = landingY()
    const xs = piece.blocks.map(([bx]) => piece.x + bx * G)
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + G
    if (y - piece.y > G) streaks.push({ x: x0, w: x1 - x0, y0: piece.y, y1: y + G, age: 0, pig: piece.pig })
    piece.y = y
    land(true)
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
      let rowMoved = false
      for (let n = 0; n < W; n++) {
        const x = ltr ? n : W - 1 - n
        const i = y * W + x
        const c = sand[i]
        if (!c || clearing[i]) continue
        const below = i + W
        if (!sand[below]) { sand[below] = c; sand[i] = 0; rowMoved = true; continue }
        const first = Math.random() < 0.5 ? -1 : 1
        for (const d of [first, -first]) {
          const nx = x + d
          if (nx < 0 || nx >= W) continue
          if (!sand[below + d] && !sand[i + d]) { sand[below + d] = c; sand[i] = 0; rowMoved = true; break }
        }
      }
      if (rowMoved) { moved = true; touchRows(y, y + 1) }
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
      if (across) found.push({ cells: queue.slice(0, tail), pig: pig - 1 })
    }
    return found
  }

  const startClearing = (found, now) => {
    let grains = 0, sx = 0, sy = 0
    for (const { cells } of found) {
      for (const i of cells) { clearing[i] = 1; sx += i % W; sy += Math.floor(i / W) }
      grains += cells.length
    }
    chain += found.length
    bridges += found.length
    const before = level
    level = levelFor(bridges)
    const points = grains * level * chain
    score += points
    sweep = { found, start: now, until: now + SWEEP_MS }
    cb.onScore?.(score)
    cb.onBridges?.(bridges)
    cb.onClear?.({ points, chain, x: sx / grains / W, y: sy / grains / H })
    if (level !== before) { cb.onLevel?.(level); sound?.level() }
    sound?.bridge(chain)
  }

  // The stretch lifts away as gold dust
  const finishClearing = () => {
    for (const { cells, pig } of sweep.found) {
      const glow = PIGMENTS[pig].glow
      const every = Math.max(1, Math.floor(cells.length / 320))
      for (let n = 0; n < cells.length; n++) {
        const i = cells[n]
        const x = i % W, y = (i - x) / W
        if (n % every === 0 && dust.length < MAX_DUST) {
          dust.push({
            x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 6, vy: -(6 + Math.random() * 16),
            age: 0, life: 1.1 + Math.random() * 1.1, size: 0.3 + Math.random() * 0.5,
            color: Math.random() < 0.55 ? '#f3dc93' : glow, rise: true, phase: Math.random() * 6.28,
          })
        }
        sand[i] = 0
        clearing[i] = 0
        touchRows(y, y)
      }
    }
    sweep = null
  }

  /* ── Loop ─────────────────────────────────────────── */
  let changed = false
  const update = (dt, now) => {
    if (sweep) {
      if (now < sweep.until) return          // a beat to watch it glow across
      finishClearing()
      changed = true
    }

    sim += dt
    let steps = 0
    while (sim >= STEP && steps < 6) { if (stepSand()) changed = true; sim -= STEP; steps++ }
    if (steps === 6) sim = 0

    if (changed) {
      changed = false
      const found = findBridges()
      if (found.length) { startClearing(found, now); return }
    }

    if (!piece) return
    fall += (soft ? SOFT_DROP : fallSpeed(level)) * dt
    while (fall >= 1) {
      if (collides(piece.blocks, piece.x, piece.y + 1)) { fall = 0; break }
      fall -= 1
      piece.y++
      lockAt = 0
    }
    if (collides(piece.blocks, piece.x, piece.y + 1)) {
      fall = 0
      if (!lockAt) lockAt = now + (soft ? 60 : LOCK_MS)
      else if (now >= lockAt) land()
    } else {
      lockAt = 0
    }
  }

  // A pane of stained glass: a lit gradient, a soft inner bevel, gold leading
  const pane = (x, y, size, p, alpha = 1) => {
    const [d, m, l, hi] = p.shades
    const g = fx.createLinearGradient(x, y, x + size, y + size)
    g.addColorStop(0, hi); g.addColorStop(0.45, l); g.addColorStop(1, m)
    fx.globalAlpha = alpha
    fx.fillStyle = g
    fx.fillRect(x, y, size, size)
    fx.fillStyle = 'rgba(255, 246, 220, 0.16)'
    fx.fillRect(x + size * 0.12, y + size * 0.12, size * 0.3, size * 0.08)
    fx.strokeStyle = d
    fx.lineWidth = Math.max(1, size * 0.05)
    fx.strokeRect(x + size * 0.14, y + size * 0.14, size * 0.72, size * 0.72)
    fx.strokeStyle = '#d9bd6a'
    fx.lineWidth = Math.max(1.2, size * 0.07)
    fx.strokeRect(x + fx.lineWidth / 2, y + fx.lineWidth / 2, size - fx.lineWidth, size - fx.lineWidth)
    fx.globalAlpha = 1
  }

  const star = (x, y, r, a) => {
    fx.globalAlpha = a
    fx.beginPath()
    fx.moveTo(x, y - r); fx.lineTo(x + r * 0.22, y - r * 0.22); fx.lineTo(x + r, y); fx.lineTo(x + r * 0.22, y + r * 0.22)
    fx.lineTo(x, y + r); fx.lineTo(x - r * 0.22, y + r * 0.22); fx.lineTo(x - r, y); fx.lineTo(x - r * 0.22, y - r * 0.22)
    fx.closePath()
    fx.fill()
    fx.globalAlpha = 1
  }

  const drawFx = (dt, now) => {
    fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height)
    const B = G * k

    // where it will land: a faint outline on the heap
    if (piece && state !== 'over') {
      const gy = landingY()
      const p = PIGMENTS[piece.pig]
      fx.strokeStyle = p.glow
      fx.lineWidth = Math.max(1, k * 0.35)
      fx.globalAlpha = 0.3
      fx.fillStyle = p.shades[2]
      for (const [bx, by] of piece.blocks) {
        const x = (piece.x + bx * G) * k, y = (gy + by * G) * k
        fx.fillRect(x, y, B, B)
      }
      fx.globalAlpha = 0.45
      for (const [bx, by] of piece.blocks) {
        fx.strokeRect((piece.x + bx * G) * k + 1, (gy + by * G) * k + 1, B - 2, B - 2)
      }
      fx.globalAlpha = 1
    }

    // a hard drop leaves a fading streak of light
    fx.globalCompositeOperation = 'lighter'
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i]
      s.age += dt
      if (s.age > 0.3) { streaks.splice(i, 1); continue }
      const a = 0.35 * (1 - s.age / 0.3)
      const g = fx.createLinearGradient(0, s.y0 * k, 0, s.y1 * k)
      g.addColorStop(0, 'rgba(255,240,200,0)')
      g.addColorStop(1, PIGMENTS[s.pig].glow)
      fx.globalAlpha = a
      fx.fillStyle = g
      fx.fillRect(s.x * k, s.y0 * k, s.w * k, (s.y1 - s.y0) * k)
    }
    fx.globalAlpha = 1
    fx.globalCompositeOperation = 'source-over'

    // the piece itself, gliding rather than stepping
    if (piece && state !== 'over') {
      viewX += (piece.x - viewX) * (1 - Math.exp(-dt * 28))
      if (Math.abs(piece.x - viewX) < 0.05) viewX = piece.x
      const resting = collides(piece.blocks, piece.x, piece.y + 1)
      const y = piece.y + (resting ? 0 : Math.min(fall, 0.99))
      const p = PIGMENTS[piece.pig]
      fx.shadowColor = p.glow
      fx.shadowBlur = k * 3
      for (const [bx, by] of piece.blocks) {
        const yy = (y + by * G) * k
        if (yy + B < 0) continue
        pane((viewX + bx * G) * k, yy, B, p)
      }
      fx.shadowBlur = 0
    }

    fx.globalCompositeOperation = 'lighter'
    // a clear: light runs across the stretch from wall to wall
    if (sweep) {
      const t = Math.min(1, (now - sweep.start) / SWEEP_MS)
      const front = t * (W + 12)
      for (const { cells, pig } of sweep.found) {
        fx.fillStyle = PIGMENTS[pig].glow
        for (const i of cells) {
          const x = i % W
          if (x > front) continue
          const a = Math.min(1, (front - x) / 10) * (0.55 + 0.35 * Math.sin(now / 60 + x * 0.3))
          fx.globalAlpha = a
          fx.fillRect(x * k, ((i - x) / W) * k, k, k)
        }
      }
      fx.globalAlpha = 1
    }

    // gold glints on the heap, now and then
    if (state === 'playing' && now > nextGlint) {
      nextGlint = now + 180 + Math.random() * 380
      for (let tries = 0; tries < 30; tries++) {
        const i = Math.floor(Math.random() * W * H)
        const c = sand[i]
        if (c && ((c & 7) === 1 || Math.random() < 0.25) && !sand[i - W]) {
          glints.push({ x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5, age: 0, life: 0.9 + Math.random() * 0.6 })
          break
        }
      }
    }
    fx.fillStyle = '#fff6da'
    for (let i = glints.length - 1; i >= 0; i--) {
      const g = glints[i]
      g.age += dt
      if (g.age > g.life || sand[Math.floor(g.y) * W + Math.floor(g.x)] === 0) { glints.splice(i, 1); continue }
      const a = Math.sin((g.age / g.life) * Math.PI)
      star(g.x * k, g.y * k, k * 1.6 * a, 0.85 * a)
    }

    // dust: puffs fall back, a clear's dust rises and sways
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i]
      d.age += dt
      if (d.age > d.life) { dust.splice(i, 1); continue }
      if (d.rise) { d.vy -= 4 * dt; d.x += Math.sin(d.age * 3 + d.phase) * dt * 4 } else d.vy += 40 * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      const a = 1 - d.age / d.life
      fx.globalAlpha = a * (d.rise ? 0.9 : 0.6)
      fx.fillStyle = d.color
      const r = d.size * k
      fx.fillRect(d.x * k - r / 2, d.y * k - r / 2, r, r)
    }
    fx.globalAlpha = 1
    fx.globalCompositeOperation = 'source-over'
  }

  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (state === 'playing') update(dt, now)
    paintSand()
    drawFx(state === 'paused' ? 0 : dt, now)
  }

  resize()
  last = performance.now()
  raf = requestAnimationFrame(frame)

  function end() {
    state = 'over'
    sound?.over()
    cb.onOver?.(score)
  }

  return {
    start() {
      sand.fill(0); clearing.fill(0)
      bag = []; next = null; held = null; canHold = true; sweep = null
      dust.length = 0; glints.length = 0; streaks.length = 0
      score = 0; bridges = 0; level = 1; chain = 0; sim = 0; soft = false
      touchRows(0, H - 1)
      cb.onScore?.(0); cb.onBridges?.(0); cb.onLevel?.(1); cb.onHold?.(null)
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
    hold,
    softDrop(on) { soft = on },
    hardDrop,
    resize,
    destroy() { cancelAnimationFrame(raf) },
  }
}
