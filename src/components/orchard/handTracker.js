// Webcam hand tracking with Google's MediaPipe Hand Landmarker. Everything runs in
// the browser — the camera picture never leaves the visitor's computer. The
// tracker (~8 MB model + ~11 MB engine) downloads on first play and is cached.
//
// The tracker runs in a worker (handWorker.js) so it never stalls the game's
// drawing; if a browser can't do that, it runs here on the page instead.

const MEDIAPIPE = '1.0.1'   // keep in step with @mediapipe/tasks-vision in package.json
const WASM_URL  = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

// The model looks at a ~200px picture anyway, so send it a small one: less to copy
const FRAME_W = 384
const FRAME_H = 288

function workerTracker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./handWorker.js', import.meta.url), { type: 'module' })
    let pending = null
    const fail = (msg) => { worker.terminate(); reject(new Error(msg)) }
    const timer = setTimeout(() => fail('The hand tracker took too long to start'), 60000)
    worker.onerror = (e) => { clearTimeout(timer); fail(e.message || 'worker failed') }
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(timer)
        resolve({
          where: 'worker',
          delegate: data.delegate,
          detect(bitmap, t) {
            return new Promise((done) => {
              pending = done
              worker.postMessage({ type: 'frame', bitmap, t }, [bitmap])
            })
          },
          close: () => worker.terminate(),
        })
      } else if (data.type === 'error') {
        clearTimeout(timer)
        fail(data.message)
      } else if (data.type === 'hand') {
        pending?.(data)
        pending = null
      }
    }
    worker.postMessage({ type: 'init', wasm: WASM_URL, model: MODEL_URL })
  })
}

async function pageTracker() {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
  const files = await FilesetResolver.forVisionTasks(WASM_URL)
  const make = (delegate) => HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  })
  let delegate = 'GPU'
  let tracker
  try { tracker = await make('GPU') } catch { delegate = 'CPU'; tracker = await make('CPU') }
  return {
    where: 'page',
    delegate,
    async detect(bitmap, t) {
      const started = performance.now()
      let points = null
      try {
        const hand = tracker.detectForVideo(bitmap, t).landmarks?.[0]
        if (hand) points = hand.map((p) => ({ x: 1 - p.x, y: p.y }))
      } catch { /* skip the frame */ }
      bitmap.close()
      return { points, t, ms: performance.now() - started }
    },
    close: () => tracker.close(),
  }
}

let loading = null

export function loadHandTracker() {
  if (!loading) {
    loading = workerTracker().catch(() => pageTracker())
    loading.catch(() => { loading = null })   // let a retry start over
  }
  return loading
}

export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Ask for the camera's fastest mode: at 60 frames a second the hand is seen
    // twice as often (most laptop cameras top out at 30, or less in dim light)
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 } },
    audio: false,
  })
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  return stream
}

export function stopCamera(stream) {
  stream?.getTracks().forEach((t) => t.stop())
}

// Sends every new camera frame to the tracker — the newest one only: if it's
// still busy, frames are skipped rather than queued, so it never falls behind.
// onHand(points | null, capturedAt): the hand's 21 points, x/y 0..1 of the picture;
// onStats({ cameraFps, trackerFps, trackerMs }).
export function trackHand(video, tracker, onHand, onStats) {
  let stopped = false
  let busy = false
  let lastTime = -1
  let handle = 0
  const useVfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
  const stats = { frames: 0, detections: 0, ms: 0, since: performance.now() }

  const send = async () => {
    busy = true
    const t = performance.now()
    try {
      const bitmap = await createImageBitmap(video, { resizeWidth: FRAME_W, resizeHeight: FRAME_H, resizeQuality: 'low' })
      if (stopped) { bitmap.close(); return }
      const res = await tracker.detect(bitmap, t)
      if (stopped) return
      stats.detections++
      stats.ms += res.ms
      onHand(res.points, t)
    } catch { /* camera not ready yet */ }
    busy = false
  }

  const tick = () => {
    if (stopped) return
    if (video.readyState >= 2 && video.currentTime !== lastTime) {
      lastTime = video.currentTime
      stats.frames++
      if (!busy) send()
    }
    const now = performance.now()
    if (now - stats.since >= 1000) {
      const secs = (now - stats.since) / 1000
      onStats?.({
        cameraFps: Math.round(stats.frames / secs),
        trackerFps: Math.round(stats.detections / secs),
        trackerMs: stats.detections ? Math.round(stats.ms / stats.detections) : 0,
      })
      Object.assign(stats, { frames: 0, detections: 0, ms: 0, since: now })
    }
    handle = useVfc ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick)
  }
  tick()

  return () => {
    stopped = true
    if (useVfc) video.cancelVideoFrameCallback?.(handle)
    else cancelAnimationFrame(handle)
  }
}
