// Cyberpunk — matrix rain, neon grid
export const CyberpunkMeta = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  bg: '#050a12',
  text: '#00ff88',
  accent: '#ff0080',
  surface: '#0a1220',
}

const COLUMNS = Array.from({ length: 40 }, (_, i) => ({
  x: i,
  y: Math.random() * 40,
  speed: 0.15 + Math.random() * 0.4,
  chars: Array.from({ length: 20 }, () =>
    String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))
  ),
}))

export function drawCyberpunk(ctx, w, h, tick) {
  ctx.clearRect(0, 0, w, h)

  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#050a12')
  bg.addColorStop(1, '#020810')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Grid lines
  ctx.strokeStyle = 'rgba(0,255,136,0.04)'
  ctx.lineWidth = 0.5
  const cellW = w / 20
  const cellH = h / 12
  for (let gx = 0; gx <= 20; gx++) {
    ctx.beginPath()
    ctx.moveTo(gx * cellW, 0)
    ctx.lineTo(gx * cellW, h)
    ctx.stroke()
  }
  for (let gy = 0; gy <= 12; gy++) {
    ctx.beginPath()
    ctx.moveTo(0, gy * cellH)
    ctx.lineTo(w, gy * cellH)
    ctx.stroke()
  }

  // Matrix rain
  const colW = w / COLUMNS.length
  ctx.font = `${Math.max(10, colW * 0.6)}px 'Space Mono', monospace`

  COLUMNS.forEach((col, ci) => {
    const cx = ci * colW + colW * 0.1
    const dropY = ((col.y + tick * col.speed) % (col.chars.length + 5))
    const gy2 = dropY * (h / (col.chars.length + 5))

    col.chars.forEach((ch, j) => {
      const charY = gy2 - j * (h / (col.chars.length + 5))
      if (charY < 0 || charY > h) return
      const distFromHead = j
      const alpha = Math.max(0, 1 - distFromHead * 0.08)
      if (distFromHead === 0) {
        ctx.fillStyle = `rgba(200,255,230,${alpha})`
      } else {
        ctx.fillStyle = `rgba(0,255,136,${alpha * 0.7})`
      }
      ctx.fillText(ch, cx, charY)
    })
  })

  // Neon horizontal scan line
  const scanY = (tick * 1.2) % h
  const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2)
  scanGrad.addColorStop(0, 'transparent')
  scanGrad.addColorStop(0.5, 'rgba(0,255,136,0.06)')
  scanGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = scanGrad
  ctx.fillRect(0, scanY - 2, w, 4)

  // Corner accents
  const drawCorner = (x, y, rx, ry) => {
    ctx.strokeStyle = 'rgba(255,0,128,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, y + ry * 20)
    ctx.lineTo(x, y)
    ctx.lineTo(x + rx * 20, y)
    ctx.stroke()
  }
  drawCorner(10, 10, 1, 1)
  drawCorner(w - 10, 10, -1, 1)
  drawCorner(10, h - 10, 1, -1)
  drawCorner(w - 10, h - 10, -1, -1)
}
