// Webcam hand tracking with Google's MediaPipe Hand Landmarker. Everything runs in
// the browser — the camera picture never leaves the visitor's computer. The
// tracker (~8 MB model + ~11 MB engine) downloads on first play and is cached.
//
// The tracker runs in a worker (handWorker.js) so it never stalls the game's
// drawing; if a browser can't do that, it runs here on the page instead.

const MEDIAPIPE = '1.0.1'   // keep in step with @mediapipe/tasks-vision in package.json
const WASM_URL  = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const INDEX_TIP = 8
// The model looks at a ~200px picture anyway, so send it a small one: less to copy
const FRAME_W = 384, FRAME_H = 288
// The faint reflection behind the game is drawn from the very frame the tracker
// read, so the fingertip light always sits on the reflected finger
const GHOST_W = 320, GHOST_H = 240

function workerTracker() {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./handWorker.js', import.meta.url), { type: 'module' })
    let pending = null
    let tracker = null
    const fail = (msg) => { worker.terminate(); reject(new Error(msg)) }
    const timer = setTimeout(() => fail('The hand tracker took too long to start'), 60000)
    worker.onerror = (e) => { clearTimeout(timer); fail(e.message || 'worker failed') }
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(timer)
        tracker = {
          where: 'worker',
          delegate: data.delegate,
          detect(bitmap, t) {
            return new Promise((done) => {
              pending = done
              worker.postMessage({ type: 'frame', bitmap, t }, [bitmap])
            })
          },
          close: () => worker.terminate(),
        }
        resolve(tracker)
      } else if (data.type === 'chosen') {
        if (tracker) Object.assign(tracker, { delegate: data.delegate, timings: data.times })   // timed both; this one's quicker here
      } else if (data.type === 'error') {
        clearTimeout(timer)
        fail(data.message)
      } else if (data.type === 'tip') {
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
      let tip = null
      try {
        const p = tracker.detectForVideo(bitmap, t).landmarks?.[0]?.[INDEX_TIP]
        if (p) tip = { x: 1 - p.x, y: p.y }
      } catch { /* skip the frame */ }
      bitmap.close()
      return { tip, t, ms: performance.now() - started }
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

// Reads the fingertip from the camera as often as the tracker can manage.
// It never queues frames (that would only make it later): if a new frame arrives
// while the tracker is busy, the newest is read the moment it's free.
//
// onReport(tip | null, capturedAt, frame): tip x/y are 0..1 of the picture;
// frame is a small copy of the picture that was read (the receiver closes it).
// onStats({ cameraFps, trackerFps, trackerMs, lagMs }) once a second.
export function trackFinger(video, tracker, onReport, onStats) {
  let stopped = false
  let busy = false
  let waiting = false        // a newer frame arrived while busy
  let lastTime = -1
  let captured = 0           // when the newest frame was taken
  let handle = 0
  const useVfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
  const stats = { frames: 0, reports: 0, ms: 0, lag: 0, since: performance.now() }

  const read = async () => {
    busy = true
    do {
      waiting = false
      const t = captured
      let small, ghost
      try {
        ;[small, ghost] = await Promise.all([
          createImageBitmap(video, { resizeWidth: FRAME_W, resizeHeight: FRAME_H, resizeQuality: 'low' }),
          createImageBitmap(video, { resizeWidth: GHOST_W, resizeHeight: GHOST_H, resizeQuality: 'low' }),
        ])
      } catch { break }    // camera not ready yet
      if (stopped) { small.close(); ghost.close(); return }
      const res = await tracker.detect(small, t)
      if (stopped) { ghost.close(); return }
      stats.reports++
      stats.ms += res.ms
      stats.lag += performance.now() - t
      onReport(res.tip, t, ghost)
    } while (waiting && !stopped)
    busy = false
  }

  const tick = (now, meta) => {
    if (stopped) return
    if (video.readyState >= 2 && video.currentTime !== lastTime) {
      lastTime = video.currentTime
      stats.frames++
      // when the camera took it, if the browser says — that's what the lag is measured from
      captured = meta?.captureTime ?? performance.now()
      if (busy) waiting = true
      else read()
    }
    const at = performance.now()
    if (at - stats.since >= 1000) {
      const secs = (at - stats.since) / 1000
      const n = stats.reports || 1
      onStats?.({
        cameraFps: Math.round(stats.frames / secs),
        trackerFps: Math.round(stats.reports / secs),
        trackerMs: Math.round(stats.ms / n),
        lagMs: Math.round(stats.lag / n),
      })
      Object.assign(stats, { frames: 0, reports: 0, ms: 0, lag: 0, since: at })
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
