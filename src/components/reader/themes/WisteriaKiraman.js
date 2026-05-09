// Wisteria Kiraman — lanterns, swaying wisteria petals
export const WisteriaKiramanMeta = {
  id: 'wisteria',
  name: 'Wisteria Kiraman',
  bg: '#1a0f2a',
  text: '#e8d8f8',
  accent: '#9060c8',
  surface: '#221538',
}

const PETALS = Array.from({ length: 40 }, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.2 + Math.random() * 0.4,
  drift: (Math.random() - 0.5) * 0.5,
  phase: Math.random() * Math.PI * 2,
  size: 2 + Math.random() * 3,
}))

export function drawWisteriaKiraman(ctx, w, h, tick) {
  ctx.clearRect(0, 0, w, h)

  // Night sky
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0d0818')
  sky.addColorStop(0.5, '#1a0f2a')
  sky.addColorStop(1, '#120820')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // Stars
  for (let i = 0; i < 50; i++) {
    const sx = (i * 163.7) % w
    const sy = (i * 71.3) % (h * 0.6)
    const blink = 0.3 + 0.5 * Math.sin(tick * 0.04 + i * 1.7)
    ctx.globalAlpha = blink
    ctx.fillStyle = '#d8c8f8'
    ctx.fillRect(sx, sy, 1, 1)
  }
  ctx.globalAlpha = 1

  // Wisteria draping clusters (top)
  const drawCluster = (cx, cy, sway) => {
    const x = cx + sway
    // stem
    ctx.strokeStyle = '#4a2880'
    ctx.lineWidth = 1
    for (let d = 0; d < 6; d++) {
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      const sx2 = x + (d - 2.5) * 14
      ctx.moveTo(sx2, cy)
      const len = 40 + d * 8
      ctx.quadraticCurveTo(sx2 + sway * 0.3, cy + len / 2, sx2 + sway * 0.2, cy + len)
      ctx.stroke()
      // flowers on each stem
      for (let f = 0; f < 5; f++) {
        const fy = cy + (len / 5) * f
        const fx2 = sx2 + Math.sin(tick * 0.02 + d + f) * 3 + sway * 0.2
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(tick * 0.03 + d * f)
        ctx.fillStyle = '#b878e8'
        ctx.beginPath()
        ctx.arc(fx2, fy, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  const leftSway = Math.sin(tick * 0.015) * 8
  const rightSway = Math.sin(tick * 0.015 + 1) * 8
  drawCluster(w * 0.25, -10, leftSway)
  drawCluster(w * 0.75, -10, rightSway)

  // Lanterns
  const drawLantern = (lx, ly, color) => {
    const swing = Math.sin(tick * 0.02 + lx) * 6
    ctx.save()
    ctx.translate(lx + swing, ly)
    // string
    ctx.strokeStyle = 'rgba(200,180,240,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, -20)
    ctx.lineTo(0, 0)
    ctx.stroke()
    // glow
    const glow = ctx.createRadialGradient(0, 20, 0, 0, 20, 35)
    glow.addColorStop(0, color + '44')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 20, 35, 0, Math.PI * 2)
    ctx.fill()
    // body
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(0, 20, 14, 20, 0, 0, Math.PI * 2)
    ctx.fill()
    // ribs
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 0.8
    for (let r = 0; r < 5; r++) {
      const ry = 4 + r * 8
      ctx.beginPath()
      ctx.ellipse(0, ry, 14 * Math.sin(Math.PI * ry / 40), 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawLantern(w * 0.3, h * 0.2, '#e8a030')
  drawLantern(w * 0.5, h * 0.15, '#c83030')
  drawLantern(w * 0.7, h * 0.22, '#e8a030')

  // Falling petals
  PETALS.forEach((p) => {
    const px = ((p.x * w + tick * p.drift + Math.sin(tick * 0.02 + p.phase) * 15)) % (w + 20)
    const py = ((p.y * h + tick * p.speed) % (h + 20)) - 20
    ctx.save()
    ctx.globalAlpha = 0.6
    ctx.fillStyle = '#c878e8'
    ctx.beginPath()
    ctx.ellipse(px, py, p.size, p.size * 0.6, tick * 0.02 + p.phase, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}
