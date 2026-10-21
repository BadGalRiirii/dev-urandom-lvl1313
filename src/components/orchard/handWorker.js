// Runs the hand tracker off the main thread, so finding the hand in a camera frame
// never holds up drawing the game. Frames arrive as ImageBitmaps; the index
// fingertip goes back.
//
// Which is quicker — the graphics card or the processor — depends on the computer
// (on many laptops copying each picture to the graphics card and back costs more
// than it saves), so both are loaded and timed on the first frames, and the
// quicker one is kept.

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const INDEX_TIP = 8
const WARMUP    = 3    // first runs compile shaders / warm caches — not timed
const TIMED     = 8    // timed runs each before choosing

let runners = []       // [{ delegate, tracker, times: [] }] — one left once chosen
let turn = 0

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

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]

function choose() {
  if (runners.some((r) => r.times.length < WARMUP + TIMED)) return
  const score = (r) => median(r.times.slice(WARMUP))
  const best = runners.reduce((a, b) => (score(b) < score(a) ? b : a))
  const times = Object.fromEntries(runners.map((r) => [r.delegate, Math.round(score(r))]))
  for (const r of runners) if (r !== best) r.tracker.close()
  runners = [best]
  self.postMessage({ type: 'chosen', delegate: best.delegate, times })
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      const files = await FilesetResolver.forVisionTasks(data.wasm, true)   // true: the ES-module build, for a module worker
      for (const delegate of ['GPU', 'CPU']) {
        // MediaPipe's loader sets itself up once per load, so the second tracker
        // needs its own copy (the query string makes the browser run it afresh)
        const own = { ...files, wasmLoaderPath: `${files.wasmLoaderPath}?${delegate}` }
        try {
          runners.push({ delegate, tracker: await make(own, data.model, delegate), times: [] })
        } catch { /* not available here — the other will do */ }
      }
      if (!runners.length) throw new Error('The hand tracker could not start')
      self.postMessage({ type: 'ready', delegate: runners.length > 1 ? 'timing' : runners[0].delegate })
    } catch (e) {
      self.postMessage({ type: 'error', message: String(e?.message || e) })
    }
    return
  }

  if (data.type === 'frame') {
    // while choosing they take turns; afterwards there's only one
    const runner = runners[turn++ % runners.length]
    const started = performance.now()
    let tip = null
    try {
      const p = runner.tracker.detectForVideo(data.bitmap, data.t).landmarks?.[0]?.[INDEX_TIP]
      if (p) tip = { x: 1 - p.x, y: p.y }   // mirrored, so it moves the way you do
    } catch { /* a bad frame — the next one will do */ }
    data.bitmap.close()
    const ms = performance.now() - started
    if (runners.length > 1) { runner.times.push(ms); choose() }
    self.postMessage({ type: 'tip', tip, t: data.t, ms })
  }
}
