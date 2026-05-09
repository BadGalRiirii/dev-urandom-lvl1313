// Cottage Core — mushrooms & frogs in a warm forest clearing
export const CottageCoreMeta = {
  id: 'cottage',
  name: 'Cottage Core',
  bg: '#f5efe0',
  text: '#3a2a1a',
  accent: '#8b5e3c',
  surface: '#ede3cc',
}

export function drawCottageCore(ctx, w, h, tick) {
  ctx.clearRect(0, 0, w, h)

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#dfe8c0')
  sky.addColorStop(1, '#f5efe0')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Floating spores / dust motes
  ctx.save()
  for (let i = 0; i < 18; i++) {
    const x = ((i * 137.5 + tick * 0.15) % w)
    const y = ((i * 89 + tick * 0.08) % h)
    const r = 1.5 + Math.sin(tick * 0.02 + i) * 0.8
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(tick * 0.03 + i)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = '#c8a87a'
    ctx.fill()
  }
  ctx.restore()

  // Ground
  ctx.fillStyle = '#b8d48a'
  ctx.fillRect(0, h * 0.78, w, h * 0.22)

  // Grass blades
  ctx.strokeStyle = '#8ab45a'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 40; i++) {
    const bx = (i * (w / 38) + tick * 0.1) % w
    const sway = Math.sin(tick * 0.04 + i * 0.6) * 4
    ctx.beginPath()
    ctx.moveTo(bx, h * 0.78)
    ctx.quadraticCurveTo(bx + sway, h * 0.78 - 22, bx + sway * 1.5, h * 0.78 - 36)
    ctx.stroke()
  }

  // Mushrooms
  const shrooms = [
    { x: w * 0.12, size: 28 },
    { x: w * 0.3, size: 20 },
    { x: w * 0.72, size: 32 },
    { x: w * 0.88, size: 22 },
  ]
  shrooms.forEach(({ x, size }) => {
    const y = h * 0.78
    const bob = Math.sin(tick * 0.02) * 1.5
    // stalk
    ctx.fillStyle = '#f0e8d0'
    ctx.fillRect(x - size * 0.15, y - size * 0.8 + bob, size * 0.3, size * 0.8)
    // cap
    ctx.fillStyle = '#cc3333'
    ctx.beginPath()
    ctx.ellipse(x, y - size * 0.85 + bob, size * 0.55, size * 0.45, 0, Math.PI, 0)
    ctx.fill()
    // spots
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (let s = 0; s < 3; s++) {
      ctx.beginPath()
      ctx.arc(x - size * 0.2 + s * size * 0.2, y - size * 0.95 + bob, size * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // Frog (bottom right area)
  const fx = w * 0.65
  const fy = h * 0.78
  const frog = Math.sin(tick * 0.015)
  ctx.save()
  ctx.translate(fx, fy + frog * 2)
  // body
  ctx.fillStyle = '#5a9a3a'
  ctx.beginPath()
  ctx.ellipse(0, -14, 16, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  // eyes
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(-7, -22, 5, 0, Math.PI * 2)
  ctx.arc(7, -22, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-6, -22, 2.5, 0, Math.PI * 2)
  ctx.arc(8, -22, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
