// Webcam hand tracking with Google's MediaPipe Hand Landmarker. Everything runs in
// the browser — the camera picture never leaves the visitor's computer. The
// tracker (~8 MB model + ~11 MB engine) downloads on first play and is cached.

const MEDIAPIPE = '1.0.1'   // keep in step with @mediapipe/tasks-vision in package.json
const WASM_URL  = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE}/wasm`
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const INDEX_TIP = 8

let loading = null

export function loadHandTracker() {
  if (!loading) {
    loading = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
      const files = await FilesetResolver.forVisionTasks(WASM_URL)
      const make = (delegate) => HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      try {
        return await make('GPU')
      } catch {
        return await make('CPU')     // no usable GPU: slower, still playable
      }
    })()
    loading.catch(() => { loading = null })   // let a retry start over
  }
  return loading
}

export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
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

// Calls onTip({ x, y }) — the index fingertip, 0..1, mirrored so it moves the way
// you do — or onTip(null) when no hand is in view. Returns a stop function.
export function trackFingertip(video, tracker, onTip) {
  let stopped = false
  let lastTime = -1
  let handle = 0
  const useVfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype

  const tick = () => {
    if (stopped) return
    if (video.readyState >= 2 && video.currentTime !== lastTime) {
      lastTime = video.currentTime
      try {
        const res = tracker.detectForVideo(video, performance.now())
        const tip = res.landmarks?.[0]?.[INDEX_TIP]
        onTip(tip ? { x: 1 - tip.x, y: tip.y } : null)
      } catch { /* a dropped frame — try the next one */ }
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
