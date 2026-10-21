// The Orchard's fruit, drawn once per size into small canvases (sprites) so each
// frame only has to stamp images. Art Nouveau treatment: flat, illustrative
// shading, a crescent highlight and a gold ink outline.

const GOLD = '#c9a847'
const INK  = 'rgba(20, 12, 6, 0.55)'

export const KINDS = {
  pomegranate: { skin: ['#5e0f1f', '#a3263a', '#d4505a'], flesh: '#f3d6c4', seed: '#b0172f', juice: '#b3203a' },
  pear:        { skin: ['#5f6b1f', '#a8b04a', '#e0d27a'], flesh: '#f4ecc8', seed: '#6b4a22', juice: '#d9d58a' },
  fig:         { skin: ['#2b1030', '#5c2556', '#8d4a7e'], flesh: '#e9a39c', seed: '#f6e3b0', juice: '#a8435f' },
  plum:        { skin: ['#1d1638', '#3c2c6e', '#6b5aa6'], flesh: '#e7b748', seed: '#8a5a1c', juice: '#7a3f8c' },
  orange:      { skin: ['#9a3f08', '#e07a1c', '#f6b04a'], flesh: '#f7b552', seed: '#fbe6b0', juice: '#f08a1e' },
  peach:       { skin: ['#9c3b2c', '#e58a6a', '#f6c79a'], flesh: '#f8cf73', seed: '#7a3a1e', juice: '#f2a06a' },
}
export const FRUIT_NAMES = Object.keys(KINDS)

const radial = (ctx, r, [dark, mid, light]) => {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1)
  g.addColorStop(0, light)
  g.addColorStop(0.45, mid)
  g.addColorStop(1, dark)
  return g
}

// Outline twice: a dark ink line and a gold one over it — the "stained glass" edge
const outline = (ctx, r) => {
  ctx.lineJoin = 'round'
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(2.5, r * 0.09)
  ctx.stroke()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = Math.max(1.4, r * 0.045)
  ctx.stroke()
}

const highlight = (ctx, r) => {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.13, -0.7, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 246, 220, 0.32)'
  ctx.fill()
  ctx.restore()
}

const leaf = (ctx, r, x, y, angle) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(r * 0.25, -r * 0.28, r * 0.62, -r * 0.22, r * 0.8, 0)
  ctx.bezierCurveTo(r * 0.6, r * 0.2, r * 0.25, r * 0.22, 0, 0)
  const g = ctx.createLinearGradient(0, 0, r * 0.8, 0)
  g.addColorStop(0, '#2f5a2a')
  g.addColorStop(1, '#6f9a45')
  ctx.fillStyle = g
  ctx.fill()
  outline(ctx, r * 0.6)
  ctx.beginPath()
  ctx.moveTo(r * 0.05, 0)
  ctx.lineTo(r * 0.7, 0)
  ctx.strokeStyle = 'rgba(201, 168, 71, 0.55)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

const stem = (ctx, r, x, y, len, bend = 0.3) => {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + r * bend * 0.5, y - len * 0.6, x + r * bend, y - len)
  ctx.strokeStyle = '#4a2d14'
  ctx.lineWidth = Math.max(2, r * 0.08)
  ctx.lineCap = 'round'
  ctx.stroke()
}

// Each draws the whole fruit centred on (0, 0), roughly within radius r
const SHAPES = {
  pomegranate(ctx, r, k) {
    ctx.beginPath()
    ctx.arc(0, r * 0.06, r * 0.94, 0, Math.PI * 2)
    ctx.fillStyle = radial(ctx, r, k.skin)
    ctx.fill()
    outline(ctx, r)
    highlight(ctx, r)
    // the crown
    ctx.beginPath()
    const top = -r * 0.84
    ctx.moveTo(-r * 0.26, top + r * 0.06)
    for (let i = 0; i <= 4; i++) {
      const x = -r * 0.26 + (i * r * 0.52) / 4
      ctx.lineTo(x, top - (i % 2 === 0 ? r * 0.26 : r * 0.08))
    }
    ctx.lineTo(r * 0.26, top + r * 0.06)
    ctx.closePath()
    ctx.fillStyle = k.skin[0]
    ctx.fill()
    outline(ctx, r * 0.7)
  },
  pear(ctx, r, k) {
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.98)
    ctx.bezierCurveTo(r * 0.42, -r * 0.98, r * 0.4, -r * 0.35, r * 0.62, -r * 0.05)
    ctx.bezierCurveTo(r * 1.05, r * 0.45, r * 0.75, r * 1.0, 0, r * 1.0)
    ctx.bezierCurveTo(-r * 0.75, r * 1.0, -r * 1.05, r * 0.45, -r * 0.62, -r * 0.05)
    ctx.bezierCurveTo(-r * 0.4, -r * 0.35, -r * 0.42, -r * 0.98, 0, -r * 0.98)
    ctx.fillStyle = radial(ctx, r, k.skin)
    ctx.fill()
    outline(ctx, r)
    highlight(ctx, r)
    stem(ctx, r, 0, -r * 0.95, r * 0.32, 0.25)
    leaf(ctx, r, r * 0.06, -r * 1.1, -0.5)
  },
  fig(ctx, r, k) {
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.0)
    ctx.bezierCurveTo(r * 0.3, -r * 0.92, r * 0.42, -r * 0.5, r * 0.78, -r * 0.05)
    ctx.bezierCurveTo(r * 1.08, r * 0.45, r * 0.62, r * 0.98, 0, r * 0.98)
    ctx.bezierCurveTo(-r * 0.62, r * 0.98, -r * 1.08, r * 0.45, -r * 0.78, -r * 0.05)
    ctx.bezierCurveTo(-r * 0.42, -r * 0.5, -r * 0.3, -r * 0.92, 0, -r * 1.0)
    ctx.fillStyle = radial(ctx, r, k.skin)
    ctx.fill()
    outline(ctx, r)
    // ribs
    ctx.strokeStyle = 'rgba(201, 168, 71, 0.22)'
    ctx.lineWidth = 1
    for (const s of [-0.35, 0, 0.35]) {
      ctx.beginPath()
      ctx.moveTo(0, -r * 0.85)
      ctx.quadraticCurveTo(r * s * 1.6, r * 0.1, r * s, r * 0.9)
      ctx.stroke()
    }
    highlight(ctx, r)
    stem(ctx, r, 0, -r * 0.98, r * 0.2, -0.2)
  },
  plum(ctx, r, k) {
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.92, r * 0.98, 0, 0, Math.PI * 2)
    ctx.fillStyle = radial(ctx, r, k.skin)
    ctx.fill()
    outline(ctx, r)
    // the seam
    ctx.beginPath()
    ctx.moveTo(r * 0.05, -r * 0.9)
    ctx.quadraticCurveTo(r * 0.38, 0, r * 0.08, r * 0.92)
    ctx.strokeStyle = 'rgba(10, 6, 24, 0.45)'
    ctx.lineWidth = Math.max(1.5, r * 0.05)
    ctx.stroke()
    // the bloom, the dusty sheen plums have
    ctx.beginPath()
    ctx.arc(-r * 0.25, -r * 0.2, r * 0.55, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(190, 200, 235, 0.10)'
    ctx.fill()
    highlight(ctx, r)
    stem(ctx, r, 0, -r * 0.92, r * 0.22, 0.2)
  },
  orange(ctx, r, k) {
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2)
    ctx.fillStyle = radial(ctx, r, k.skin)
    ctx.fill()
    outline(ctx, r)
    // pitted peel
    ctx.fillStyle = 'rgba(120, 50, 4, 0.22)'
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39996, d = r * 0.75 * Math.sqrt((i + 0.5) / 26)
      ctx.beginPath()
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.8, r * 0.025), 0, Math.PI * 2)
      ctx.fill()
    }
    highlight(ctx, r)
    leaf(ctx, r, 0, -r * 0.9, -0.9)
  },
  peach(ctx, r, k) {
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.82)
    ctx.bezierCurveTo(r * 0.55, -r * 1.05, r * 1.0, -r * 0.55, r * 0.95, 0.05 * r)
    ctx.bezierCurveTo(r * 0.92, r * 0.62, r * 0.5, r * 0.98, 0, r * 0.98)
    ctx.bezierCurveTo(-r * 0.5, r * 0.98, -r * 0.92, r * 0.62, -r * 0.95, 0.05 * r)
    ctx.bezierCurveTo(-r * 1.0, -r * 0.55, -r * 0.55, -r * 1.05, 0, -r * 0.82)
    ctx.fillStyle = radial(ctx, r, k.skin)
    ctx.fill()
    outline(ctx, r)
    // the cleft
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.8)
    ctx.bezierCurveTo(-r * 0.3, -r * 0.3, -r * 0.25, r * 0.4, -r * 0.05, r * 0.9)
    ctx.strokeStyle = 'rgba(120, 30, 20, 0.35)'
    ctx.lineWidth = Math.max(1.5, r * 0.05)
    ctx.stroke()
    highlight(ctx, r)
    leaf(ctx, r, r * 0.05, -r * 0.82, -0.35)
  },
  // The hazard: a jewelled scarab, the Art Nouveau beetle. Slicing one costs a life.
  scarab(ctx, r) {
    ctx.strokeStyle = '#1a120a'
    ctx.lineWidth = Math.max(2, r * 0.07)
    ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      for (const [y, reach] of [[-0.25, 0.95], [0.1, 1.05], [0.45, 0.95]]) {
        ctx.beginPath()
        ctx.moveTo(side * r * 0.45, r * y)
        ctx.quadraticCurveTo(side * r * 0.85, r * (y - 0.15), side * r * reach, r * (y + 0.2))
        ctx.stroke()
      }
    }
    // body
    ctx.beginPath()
    ctx.ellipse(0, r * 0.12, r * 0.62, r * 0.82, 0, 0, Math.PI * 2)
    const g = ctx.createLinearGradient(-r * 0.6, -r * 0.6, r * 0.6, r * 0.9)
    g.addColorStop(0, '#1e5a52')
    g.addColorStop(0.45, '#0c2722')
    g.addColorStop(0.75, '#2a6b3a')
    g.addColorStop(1, '#0a1a14')
    ctx.fillStyle = g
    ctx.fill()
    outline(ctx, r)
    // wing split + head
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.42)
    ctx.lineTo(0, r * 0.9)
    ctx.strokeStyle = GOLD
    ctx.lineWidth = Math.max(1.2, r * 0.04)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(0, -r * 0.62, r * 0.36, r * 0.24, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#0d1f1a'
    ctx.fill()
    outline(ctx, r * 0.7)
    // gold horns
    ctx.beginPath()
    ctx.moveTo(-r * 0.18, -r * 0.8); ctx.quadraticCurveTo(-r * 0.3, -r * 1.05, -r * 0.08, -r * 1.08)
    ctx.moveTo(r * 0.18, -r * 0.8);  ctx.quadraticCurveTo(r * 0.3, -r * 1.05, r * 0.08, -r * 1.08)
    ctx.strokeStyle = GOLD
    ctx.lineWidth = Math.max(1.4, r * 0.05)
    ctx.stroke()
    // a jewel on the back
    ctx.beginPath()
    ctx.arc(0, r * 0.05, r * 0.12, 0, Math.PI * 2)
    ctx.fillStyle = '#9a3855'
    ctx.fill()
    outline(ctx, r * 0.5)
  },
}

// The cut face: drawn along the cut line inside each half
export function drawFlesh(ctx, kind, r) {
  const k = KINDS[kind]
  if (!k) return
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.9, r * 0.24, 0, 0, Math.PI * 2)
  ctx.fillStyle = k.flesh
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = Math.max(1, r * 0.03)
  ctx.stroke()
  ctx.fillStyle = k.seed
  if (kind === 'pomegranate' || kind === 'fig') {
    for (let i = 0; i < 9; i++) {
      ctx.beginPath()
      ctx.arc((i - 4) * r * 0.18, ((i % 3) - 1) * r * 0.06, r * 0.05, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'orange') {
    ctx.strokeStyle = 'rgba(255, 240, 200, 0.7)'
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(i * r * 0.26, r * 0.2 * (i % 2 ? 1 : -1)); ctx.stroke()
    }
  } else {
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.2, r * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Sprites at the current size and pixel ratio
export function buildSprites(r, dpr) {
  const size = Math.ceil(r * 2.6 * dpr)
  const out = {}
  for (const kind of [...FRUIT_NAMES, 'scarab']) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.translate(size / 2, size / 2)
    ctx.scale(dpr, dpr)
    SHAPES[kind](ctx, r, KINDS[kind])
    out[kind] = c
  }
  return { sprites: out, size: size / dpr }
}
