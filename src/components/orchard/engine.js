// The Orchard — game loop, physics and drawing on one canvas.
// The page feeds it blade points (from the hand tracker, a mouse or a finger) and
// hears back about the score, lives and the end of a round.

import { KINDS, FRUIT_NAMES, buildSprites, drawFlesh } from './fruits'

const GRAVITY      = 1.5     // screen heights per second²
const SLASH_SPEED  = 0.7     // screen heights per second — slower movement doesn't cut
const TRAIL_MS     = 170
const STROKE_GAP   = 280     // ms between points before it counts as a new stroke (hand tracking can skip a frame or two)
const COMBO_GAP    = 260     // ms between cuts that still belong to one swipe
const START_LIVES  = 3
const FINGER_PAD   = 0.15    // a fingertip cuts this much (× fruit radius) beyond its centre line

const rand  = (a, b) => a + Math.random() * (b - a)
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Closest distance from point (px, py) to the segment a→b
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const x = ax + t * dx - px, y = ay + t * dy - py
  return Math.sqrt(x * x + y * y)
}

export function createOrchard(canvas, { onScore, onLives, onOver, sound } = {}) {
  const ctx    = canvas.getContext('2d')
  const stains = document.createElement('canvas')
  const sctx   = stains.getContext('2d')

  let W = 0, H = 0, dpr = 1, R = 40
  let art = { sprites: {}, size: 0 }

  let mode   = 'idle'        // idle (just the blade) | play | over
  let paused = false
  let items = [], halves = [], drops = [], popups = [], queue = []
  let cursor = null
  let fadeWait = 0, fps = 60, fpsFrames = 0, fpsSince = performance.now()
  let score = 0, lives = START_LIVES, elapsed = 0, nextWave = 0
  let combo = 0, lastCut = 0, flash = 0, shake = 0
  let raf = 0, last = performance.now()

  function resize() {
    // 1.5× is sharp enough for moving fruit, and much less to fill each frame than 2×
    dpr = Math.min(1.5, window.devicePixelRatio || 1)
    W = canvas.clientWidth
    H = canvas.clientHeight
    canvas.width  = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    stains.width  = canvas.width
    stains.height = canvas.height
    R = Math.max(30, Math.min(66, Math.min(W, H) * 0.062))
    art = buildSprites(R, dpr)
  }

  /* ── Spawning ─────────────────────────────────────── */
  function launch(kind) {
    const fromX = rand(W * 0.15, W * 0.85)
    const apex  = rand(H * 0.12, H * 0.45)               // highest point on screen
    const g     = GRAVITY * H
    const vy    = -Math.sqrt(2 * g * (H + R - apex))
    const flight = (-vy / g) * 2
    const toX   = rand(W * 0.2, W * 0.8)
    items.push({
      kind, x: fromX, y: H + R, vx: (toX - fromX) / flight, vy,
      rot: rand(0, Math.PI * 2), spin: rand(-2.6, 2.6), r: R,
    })
  }

  function wave() {
    const n = 1 + Math.floor(Math.random() * Math.min(5, 1 + elapsed / 18))
    // staggered a little, on game time (so a pause holds them too)
    for (let i = 0; i < n; i++) queue.push({ at: elapsed + i * rand(0.07, 0.22), kind: pick(FRUIT_NAMES) })
    const scarabChance = elapsed < 8 ? 0 : Math.min(0.32, 0.1 + elapsed * 0.0025)
    if (Math.random() < scarabChance) queue.push({ at: elapsed + rand(0, 0.3), kind: 'scarab' })
    nextWave = elapsed + Math.max(0.65, 1.9 - elapsed * 0.014) + rand(-0.2, 0.3)
  }

  /* ── Cutting ──────────────────────────────────────── */
  function cut(item, angle, now) {
    item.dead = true
    const k = KINDS[item.kind]
    const nx = -Math.sin(angle), ny = Math.cos(angle)        // pushes the halves apart
    for (const side of [-1, 1]) {
      halves.push({
        kind: item.kind, x: item.x, y: item.y, r: item.r, side,
        angle, inner: item.rot - angle,
        vx: item.vx * 0.6 + side * nx * 140, vy: Math.min(item.vy, 0) * 0.4 + side * ny * 140 - 60,
        spin: side * rand(1.5, 3.5), life: 2.2,
      })
    }
    const colour = item.kind === 'scarab' ? '#1e5a52' : k.juice
    for (let i = 0; i < 22; i++) {
      const a = rand(0, Math.PI * 2), s = rand(60, 420)
      drops.push({ x: item.x, y: item.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
                   life: rand(0.4, 0.9), max: 0.9, size: rand(2, 6), colour })
    }
    // an ink-splash stain on the "glass" that slowly fades: a core, droplets
    // flung outwards and a couple of streaks along the cut
    sctx.save()
    sctx.scale(dpr, dpr)
    sctx.fillStyle = colour
    sctx.globalAlpha = 0.3
    sctx.beginPath()
    sctx.ellipse(item.x, item.y, R * 0.5, R * 0.36, angle, 0, Math.PI * 2)
    sctx.fill()
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2), d = rand(R * 0.4, R * 1.6)
      sctx.globalAlpha = rand(0.18, 0.38)
      sctx.beginPath()
      sctx.arc(item.x + Math.cos(a) * d, item.y + Math.sin(a) * d, rand(1.5, R * 0.14) * (1.4 - d / (R * 1.6)), 0, Math.PI * 2)
      sctx.fill()
    }
    sctx.strokeStyle = colour
    sctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      sctx.globalAlpha = 0.22
      sctx.lineWidth = rand(2, R * 0.12)
      sctx.beginPath()
      sctx.moveTo(item.x, item.y)
      sctx.lineTo(item.x + Math.cos(angle) * side * R * rand(1.1, 2), item.y + Math.sin(angle) * side * R * rand(1.1, 2))
      sctx.stroke()
    }
    sctx.restore()

    if (item.kind === 'scarab') {
      sound?.scarab()
      flash = 1
      shake = 14
      popups.push({ text: '− a life', x: item.x, y: item.y, t: 0, colour: '#d06a7e' })
      loseLife()
      return
    }
    sound?.slice()
    score += 1
    combo = now - lastCut < COMBO_GAP ? combo + 1 : 1
    lastCut = now
    popups.push({ text: '+1', x: item.x, y: item.y - R * 0.6, t: 0, colour: '#f0e2cc' })
    onScore?.(score)
  }

  function loseLife() {
    if (mode !== 'play') return
    lives = Math.max(0, lives - 1)
    onLives?.(lives)
    if (lives === 0) {
      mode = 'over'
      setTimeout(() => onOver?.(score), 1100)    // let the last cut play out first
    }
  }

  function settleCombo(now) {
    if (combo >= 3 && now - lastCut > COMBO_GAP) {
      score += combo
      onScore?.(score)
      sound?.combo()
      popups.push({ text: `Combo ×${combo}  +${combo}`, x: W / 2, y: H * 0.3, t: 0, colour: '#c9a847', big: true })
      combo = 0
    } else if (now - lastCut > COMBO_GAP) {
      combo = 0
    }
  }

  /* ── Blades ───────────────────────────────────────── */
  // A blade is anything that cuts: the mouse or a finger on the screen, or each
  // tracked fingertip. Each keeps its own short trail.
  const blades = new Map()
  const bladeTrail = (id) => {
    let t = blades.get(id)
    if (!t) blades.set(id, (t = []))
    return t
  }

  // One step of a blade: extends its trail and cuts whatever the step crosses.
  // pad widens the blade — a hand is thicker than a mouse pointer.
  function step(id, x, y, now, pad = 0) {
    const trail = bladeTrail(id)
    const prev = trail[trail.length - 1]
    trail.push({ x, y, t: now })
    if (!prev || now - prev.t > STROKE_GAP || mode !== 'play' || paused) return
    const dt = (now - prev.t) / 1000 || 0.001
    const dist = Math.hypot(x - prev.x, y - prev.y)
    if (dist / dt < SLASH_SPEED * H) return
    const angle = Math.atan2(y - prev.y, x - prev.x)
    for (const it of items) {
      if (!it.dead && segDist(it.x, it.y, prev.x, prev.y, x, y) <= it.r * 0.95 + pad) cut(it, angle, now)
    }
  }

  // Mouse / finger on the screen: points arrive every frame anyway
  function point(x, y) {
    cursor = { x, y }
    step('pointer', x, y, performance.now())
  }

  // A tracked fingertip: the page hands over a function that says where the
  // finger is at any moment (smoothed, gliding between tracker reports), and the
  // blade follows it every frame
  let follow = null
  function track(fn) { follow = fn }

  function followFinger(now) {
    if (!follow) return
    const p = follow(now)
    if (!p) return
    cursor = p
    step('finger', p.x, p.y, now, R * FINGER_PAD)
  }

  function lift() { blades.clear(); cursor = null }

  /* ── Frame ────────────────────────────────────────── */
  function update(dt, now) {
    if (mode === 'play') {
      elapsed += dt
      if (elapsed >= nextWave) wave()
      queue = queue.filter((q) => (q.at <= elapsed ? (launch(q.kind), false) : true))
    }
    const g = GRAVITY * H
    for (const it of items) {
      it.vy += g * dt
      it.x += it.vx * dt
      it.y += it.vy * dt
      it.rot += it.spin * dt
      if (!it.dead && it.vy > 0 && it.y > H + it.r * 1.5) {
        it.dead = true
        if (it.kind !== 'scarab') { sound?.miss(); loseLife() }
      }
    }
    items = items.filter((it) => !it.dead)
    for (const h of halves) {
      h.vy += g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.angle += h.spin * dt; h.life -= dt
    }
    halves = halves.filter((h) => h.life > 0 && h.y < H + h.r * 3)
    for (const d of drops) {
      d.vy += g * 0.6 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt
    }
    drops = drops.filter((d) => d.life > 0)
    for (const p of popups) p.t += dt
    popups = popups.filter((p) => p.t < (p.big ? 1.6 : 0.8))
    for (const [id, trail] of blades) {
      const kept = trail.filter((p) => now - p.t < TRAIL_MS)
      if (kept.length) blades.set(id, kept)
      else blades.delete(id)
    }
    settleCombo(now)
    flash = Math.max(0, flash - dt * 2.2)
    shake = Math.max(0, shake - dt * 40)

    // stains fade over ~4s — a few times a second is plenty (and a tiny per-frame
    // fade would round to nothing and leave them for good)
    fadeWait += dt
    if (fadeWait > 0.15) {
      sctx.globalCompositeOperation = 'destination-out'
      sctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeWait * 0.35)})`
      sctx.fillRect(0, 0, stains.width, stains.height)
      sctx.globalCompositeOperation = 'source-over'
      fadeWait = 0
    }
  }

  function drawSprite(kind, x, y, rot) {
    const s = art.size
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.drawImage(art.sprites[kind], -s / 2, -s / 2, s, s)
    ctx.restore()
  }

  function drawTrails(now) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const trail of blades.values()) {
      if (trail.length < 2) continue
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1], b = trail[i]
          const age   = 1 - (now - b.t) / TRAIL_MS
          const taper = i / trail.length
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          if (pass === 0) {
            ctx.strokeStyle = `rgba(201, 168, 71, ${0.22 * age})`
            ctx.lineWidth = 2 + 16 * taper
          } else {
            ctx.strokeStyle = `rgba(255, 240, 200, ${0.95 * age})`
            ctx.lineWidth = 1 + 5 * taper
          }
          ctx.stroke()
        }
      }
    }
    if (cursor) glow(cursor.x, cursor.y, 22, 1)
  }

  function glow(x, y, r, strength) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255, 240, 200, ${0.95 * strength})`)
    g.addColorStop(0.3, `rgba(201, 168, 71, ${0.55 * strength})`)
    g.addColorStop(1, 'rgba(201, 168, 71, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  function draw(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(stains, 0, 0)
    const sx = shake ? rand(-shake, shake) : 0, sy = shake ? rand(-shake, shake) : 0
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr)

    for (const h of halves) {
      const s = art.size
      ctx.save()
      ctx.globalAlpha = Math.min(1, h.life * 1.5)
      ctx.translate(h.x, h.y)
      ctx.rotate(h.angle)
      ctx.beginPath()
      ctx.rect(-s / 2, h.side < 0 ? -s / 2 : 0, s, s / 2)
      ctx.clip()
      ctx.save()
      ctx.rotate(h.inner)
      ctx.drawImage(art.sprites[h.kind], -s / 2, -s / 2, s, s)
      ctx.restore()
      drawFlesh(ctx, h.kind, h.r)
      ctx.restore()
    }
    for (const it of items) drawSprite(it.kind, it.x, it.y, it.rot)
    for (const d of drops) {
      ctx.globalAlpha = Math.max(0, d.life / d.max)
      ctx.fillStyle = d.colour
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    for (const p of popups) {
      const life = p.big ? 1.6 : 0.8
      ctx.globalAlpha = Math.max(0, 1 - p.t / life)
      ctx.fillStyle = p.colour
      ctx.font = p.big
        ? `italic 600 ${Math.round(R * 0.95)}px "Cormorant Garamond", Georgia, serif`
        : `600 ${Math.round(R * 0.55)}px "Cormorant SC", Georgia, serif`
      ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 8
      ctx.fillText(p.text, p.x, p.y - p.t * 60)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1
    drawTrails(now)

    if (flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = `rgba(154, 56, 85, ${flash * 0.35})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!paused) { followFinger(now); update(dt, now) }
    fpsFrames++
    if (now - fpsSince >= 1000) { fps = Math.round((fpsFrames * 1000) / (now - fpsSince)); fpsFrames = 0; fpsSince = now }
    draw(now)
  }

  resize()
  raf = requestAnimationFrame(frame)

  return {
    resize,
    point,
    track,
    lift,
    start() {
      items = []; halves = []; drops = []; popups = []; queue = []
      sctx.clearRect(0, 0, stains.width, stains.height)
      score = 0; lives = START_LIVES; elapsed = 0; nextWave = 0.6; combo = 0
      paused = false
      mode = 'play'
      onScore?.(0)
      onLives?.(lives)
    },
    idle()   { mode = 'idle'; items = []; queue = [] },
    pause()  { paused = true },
    resume() { paused = false; last = performance.now() },
    get playing() { return mode === 'play' && !paused },
    get fps() { return fps },
    destroy() { cancelAnimationFrame(raf) },
  }
}
