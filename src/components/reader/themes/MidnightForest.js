// Midnight Forest — deer, fireflies, and pine silhouettes
export const MidnightForestMeta = {
  id: 'midnight',
  name: 'Midnight Forest',
  bg: '#0d1a0f',
  text: '#c8e0b8',
  accent: '#4a8a3a',
  surface: '#121f14',
}

export function drawMidnightForest(ctx, w, h, tick) {
  ctx.clearRect(0, 0, w, h)

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0a0f18')
  sky.addColorStop(0.6, '#0d1a0f')
  sky.addColorStop(1, '#0a1208')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx = (i * 173.7) % w
    const sy = (i * 61.3) % (h * 0.5)
    const blink = 0.4 + 0.6 * Math.sin(tick * 0.05 + i * 1.3)
    ctx.globalAlpha = blink * 0.7
    ctx.fillStyle = '#e8f0d8'
    ctx.fillRect(sx, sy, 1, 1)
  }
  ctx.globalAlpha = 1

  // Moon
  ctx.save()
  const moonX = w * 0.8
  const moonY = h * 0.12
  const grad = ctx.createRadialGradient(moonX, moonY, 2, moonX, moonY, 28)
  grad.addColorStop(0, '#f8f0d8')
  grad.addColorStop(0.7, '#e8e0c0')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(moonX, moonY, 28, 0, Math.PI * 2)
  ctx.fill()
  // moon glow
  ctx.globalAlpha = 0.08
  ctx.beginPath()
  ctx.arc(moonX, moonY, 60, 0, Math.PI * 2)
  ctx.fillStyle = '#f0e8c8'
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()

  // Pine trees
  const drawTree = (x, height, dark) => {
    const layers = 4
    for (let l = 0; l < layers; l++) {
      const ly = h * 0.75 - height * (l / layers)
      const lw = height * 0.35 * ((layers - l) / layers)
      ctx.fillStyle = dark ? '#0a180c' : '#0f2212'
      ctx.beginPath()
      ctx.moveTo(x, ly - height * 0.25 / layers)
      ctx.lineTo(x - lw, ly + height * 0.12 / layers)
      ctx.lineTo(x + lw, ly + height * 0.12 / layers)
      ctx.closePath()
      ctx.fill()
    }
  }
  [0.05, 0.15, 0.25, 0.82, 0.9, 0.97].forEach((xp, i) => drawTree(w * xp, 80 + (i % 3) * 30, i % 2 === 0))

  // Ground mist
  const mist = ctx.createLinearGradient(0, h * 0.7, 0, h)
  mist.addColorStop(0, 'transparent')
  mist.addColorStop(0.5, 'rgba(120,160,100,0.06)')
  mist.addColorStop(1, 'rgba(80,120,60,0.12)')
  ctx.fillStyle = mist
  ctx.fillRect(0, h * 0.7, w, h * 0.3)

  // Deer
  ctx.save()
  const deerX = w * 0.5 + Math.sin(tick * 0.008) * (w * 0.08)
  const deerY = h * 0.72
  ctx.translate(deerX, deerY)
  ctx.fillStyle = '#5a3018'
  // body
  ctx.beginPath()
  ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2)
  ctx.fill()
  // neck
  ctx.fillRect(-4, -22, 8, 20)
  // head
  ctx.beginPath()
  ctx.ellipse(0, -28, 10, 8, 0.2, 0, Math.PI * 2)
  ctx.fill()
  // antlers
  ctx.strokeStyle = '#3a2010'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-4, -34)
  ctx.lineTo(-10, -50)
  ctx.moveTo(-10, -50)
  ctx.lineTo(-14, -44)
  ctx.moveTo(-10, -50)
  ctx.lineTo(-6, -46)
  ctx.moveTo(4, -34)
  ctx.lineTo(10, -50)
  ctx.moveTo(10, -50)
  ctx.lineTo(14, -44)
  ctx.moveTo(10, -50)
  ctx.lineTo(6, -46)
  ctx.stroke()
  ctx.restore()

  // Fireflies
  for (let i = 0; i < 12; i++) {
    const fx = (w * 0.2 + i * 57.3 + Math.sin(tick * 0.03 + i) * 30) % (w * 0.7) + w * 0.15
    const fy = h * 0.5 + Math.cos(tick * 0.025 + i * 1.2) * 60
    const glow = 0.5 + 0.5 * Math.sin(tick * 0.12 + i * 2.1)
    ctx.save()
    ctx.globalAlpha = glow * 0.8
    const ffg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6)
    ffg.addColorStop(0, '#c8ff80')
    ffg.addColorStop(1, 'transparent')
    ctx.fillStyle = ffg
    ctx.beginPath()
    ctx.arc(fx, fy, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = glow
    ctx.fillStyle = '#d8ff90'
    ctx.beginPath()
    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
