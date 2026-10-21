// Turns the tracker's fingertip reports (15–30 a second) into a fingertip that
// moves smoothly every frame.
//
// It keeps a running estimate of position and velocity (an alpha-beta filter:
// steady, but quick to follow a change of direction). Between reports it glides
// on along that velocity, from when the report arrived — so it stays in step with
// the reflection, which shows the same camera frame. A final speed-aware ease
// keeps a still finger from wobbling without slowing a slash.
// Coordinates are 0..1 of the camera picture, times in ms.

export function createFingertip({
  alpha = 0.8,       // how much each report corrects the position (1 = trust it fully)
  beta = 0.3,        // how much it corrects the velocity
  maxLead = 70,      // glide at most this long past a report (ms)
  stillSpeed = 0.3,  // pictures/s: slower than this counts as holding still
} = {}) {
  let s = null       // the estimate { x, y, vx, vy, t, arrived }
  let shown = null   // what was last drawn

  return {
    reset() { s = null; shown = null },

    // A report: the fingertip at (x, y) in the frame captured at time t
    update(x, y, t) {
      const arrived = performance.now()
      if (!s || t - s.t > 400) {
        s = { x, y, vx: 0, vy: 0, t, arrived }
        return
      }
      const dt = Math.max(0.005, (t - s.t) / 1000)
      const px = s.x + s.vx * dt, py = s.y + s.vy * dt
      const rx = x - px, ry = y - py
      s.x = px + alpha * rx
      s.y = py + alpha * ry
      s.vx += (beta / dt) * rx
      s.vy += (beta / dt) * ry
      s.t = t
      s.arrived = arrived
    },

    // Where to draw the fingertip at time `now`
    at(now) {
      if (!s) return null
      const lead = Math.min(Math.max(0, now - s.arrived), maxLead) / 1000
      const speed = Math.hypot(s.vx, s.vy)
      const moving = Math.min(1, speed / stillSpeed)          // 0 still … 1 moving
      const target = { x: s.x + s.vx * lead * moving, y: s.y + s.vy * lead * moving }
      // still: ease a third of the way each frame; moving: go straight there
      const k = 0.35 + 0.65 * moving
      shown = shown ? { x: shown.x + (target.x - shown.x) * k, y: shown.y + (target.y - shown.y) * k } : target
      return shown
    },
  }
}
