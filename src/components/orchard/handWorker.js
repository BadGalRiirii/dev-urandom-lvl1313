// Runs the hand tracker off the main thread, so finding the hand in a camera frame
// never holds up drawing the game. Frames arrive as ImageBitmaps; the hand's 21
// points go back.

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

let tracker = null

const make = (files, model, delegate) => HandLandmarker.createFromOptions(files, {
  baseOptions: { modelAssetPath: model, delegate },
  runningMode: 'VIDEO',
  numHands: 1,
  // Low bars for keeping hold of a hand already found: a fast slash blurs, and
  // dropping it means a slow full search to find it again
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.3,
  minTrackingConfidence: 0.3,
})

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      const files = await FilesetResolver.forVisionTasks(data.wasm, true)   // true: the ES-module build, for a module worker
      let delegate = 'GPU'
      try {
        tracker = await make(files, data.model, 'GPU')
      } catch {
        delegate = 'CPU'
        tracker = await make(files, data.model, 'CPU')
      }
      self.postMessage({ type: 'ready', delegate })
    } catch (e) {
      self.postMessage({ type: 'error', message: String(e?.message || e) })
    }
    return
  }

  if (data.type === 'frame') {
    const started = performance.now()
    let points = null
    try {
      const hand = tracker.detectForVideo(data.bitmap, data.t).landmarks?.[0]
      if (hand) points = hand.map((p) => ({ x: 1 - p.x, y: p.y }))   // mirrored, so it moves the way you do
    } catch { /* a bad frame — the next one will do */ }
    data.bitmap.close()
    self.postMessage({ type: 'hand', points, t: data.t, ms: performance.now() - started })
  }
}
