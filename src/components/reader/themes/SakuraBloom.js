// Sakura Bloom — falling petals, soft pink sky
export const SakuraBloomMeta = {
  id: 'sakura',
  name: 'Sakura Bloom',
  bg: '#fdf0f5',
  text: '#2a1a20',
  accent: '#d45080',
  surface: '#f8e8f0',
}

const PETALS = Array.from({ length: 30 }, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  s: 0.4 + Math.random() * 0.8,
  speed: 0.15 + Math.random() * 0.3,
  drift: (Math.random() - 0.5) * 0.8,
  rot: Math.random() * Math.PI * 2,
  rotSpeed: (Math.random() - 0.5) * 0.04,
  phase: Math.random() * Math.PI * 2,
}))

export function drawSakuraBloom(ctx, w, h, tick) {
  ctx.clearRect(0, 0, w, h)

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#f8d8e8')
  sky.addColorStop(0.5, '#fce8f2')
  sky.addColorStop(1, '#fff0f8')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Branch silhouettes
  ctx.strokeStyle = '#8a4060'
  ctx.lineWidth = 3
  ctx.save()
  ctx.globalAlpha = 0.4
  // Left branch
  ctx.beginPath()
  ctx.moveTo(-10, h * 0.15)
  ctx.quadraticCurveTo(w * 0.15, h * 0.1, w * 0.35, h * 0.08)
  ctx.stroke()
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(w * 0.15, h * 0.1)
  ctx.lineTo(w * 0.12, h * 0.04)
  ctx.moveTo(w * 0.25, h * 0.09)
  ctx.lineTo(w * 0.22, h * 0.03)
  ctx.stroke()
  // Right branch
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w + 10, h * 0.2)
  ctx.quadraticCurveTo(w * 0.85, h * 0.12, w * 0.65, h * 0.1)
  ctx.stroke()
  ctx.restore()

  // Petals
  PETALS.forEach((p, i) => {
    const px = ((p.x * w + tick * p.drift * 0.5 + Math.sin(tick * 0.02 + p.phase) * 20)) % (w + 40)
    const py = ((p.y * h + tick * p.speed) % (h + 40)) - 40
    const rot = p.rot + tick * p.rotSpeed

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rot)
    ctx.globalAlpha = 0.7 + 0.2 * Math.sin(tick * 0.03 + i)
    ctx.fillStyle = i % 3 === 0 ? '#f0a0b8' : i % 3 === 1 ? '#e888a8' : '#f8c0d0'
    ctx.scale(p.s, p.s)

    // Petal shape (5-petal flower)
    for (let j = 0; j < 5; j++) {
      ctx.save()
      ctx.rotate((j * Math.PI * 2) / 5)
      ctx.beginPath()
      ctx.ellipse(0, -5, 3, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  })
}
