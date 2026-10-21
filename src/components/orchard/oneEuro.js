// One Euro filter (Casiez, Roussel & Vogel, 2012) — the usual cure for shaky hand
// tracking. It smooths hard while the hand is nearly still (no jitter) and hardly
// at all while it moves fast (no lag on a slash). Values here are 0..1 of the
// camera picture, times in ms.

export function oneEuro({ minCutoff = 1.2, beta = 6, dCutoff = 1 } = {}) {
  let x = null
  let dx = 0
  let lastT = 0
  const alpha = (cutoff, dt) => {
    const r = 2 * Math.PI * cutoff * dt
    return r / (r + 1)
  }
  return {
    reset() { x = null },
    filter(value, t) {
      if (x === null) { x = value; dx = 0; lastT = t; return value }
      const dt = Math.max(0.001, (t - lastT) / 1000)
      lastT = t
      dx += alpha(dCutoff, dt) * ((value - x) / dt - dx)
      x += alpha(minCutoff + beta * Math.abs(dx), dt) * (value - x)
      return x
    },
  }
}
