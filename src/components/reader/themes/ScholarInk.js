// Scholar Ink — quill writing on parchment
export const ScholarInkMeta = {
  id: 'scholar',
  name: 'Scholar Ink',
  bg: '#f0e8d0',
  text: '#1a1208',
  accent: '#4a3010',
  surface: '#e8dfc0',
}

export function drawScholarInk(ctx, w, h, tick) {
  ctx.clearRect(0, 0, w, h)

  // Parchment
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
  bg.addColorStop(0, '#f5edcc')
  bg.addColorStop(1, '#e8d8a8')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Aged paper texture lines
  ctx.strokeStyle = 'rgba(140,100,40,0.08)'
  ctx.lineWidth = 0.5
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  // Ink blots / corner stains
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = '#4a3010'
  ctx.beginPath()
  ctx.ellipse(0, 0, 80, 60, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(w, h, 60, 50, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Quill pen animation
  const qPhase = (tick * 0.025) % (Math.PI * 2)
  const writing = qPhase < Math.PI * 1.5
  const qX = w * 0.15 + (writing ? (qPhase / (Math.PI * 1.5)) * w * 0.65 : w * 0.65)
  const qY = h * 0.3 + Math.floor(qPhase / (Math.PI * 1.5)) * 30

  ctx.save()
  ctx.translate(qX, qY)
  ctx.rotate(-0.4)

  // Ink trail
  if (writing) {
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = '#1a1208'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-8, 0)
    ctx.lineTo(0, 0)
    ctx.stroke()
  }

  // Quill body
  ctx.globalAlpha = 1
  ctx.fillStyle = '#f8f0d0'
  ctx.strokeStyle = '#c8a848'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-10, -20, -30, -60)
  ctx.quadraticCurveTo(-15, -40, -5, -20)
  ctx.quadraticCurveTo(-8, -30, 0, -50)
  ctx.quadraticCurveTo(5, -25, -2, 0)
  ctx.fill()
  ctx.stroke()
  // Nib
  ctx.fillStyle = '#8b6820'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-3, 6)
  ctx.lineTo(3, 6)
  ctx.closePath()
  ctx.fill()

  ctx.restore()

  // Ink particles (tiny droplets near quill)
  if (writing) {
    for (let d = 0; d < 3; d++) {
      const dx = qX + (Math.random() - 0.5) * 6
      const dy = qY + (Math.random() - 0.5) * 6
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.fillStyle = '#1a1208'
      ctx.beginPath()
      ctx.arc(dx, dy, 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}
