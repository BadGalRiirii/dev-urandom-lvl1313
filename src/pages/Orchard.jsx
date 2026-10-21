import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createOrchard } from '../components/orchard/engine'
import { createSound } from '../components/orchard/sound'
import { loadHandTracker, startCamera, stopCamera, trackHand } from '../components/orchard/handTracker'
import { oneEuro } from '../components/orchard/oneEuro'
import './Orchard.css'

const SCORES_KEY = 'riri_orchard_scores'
const MUTE_KEY   = 'riri_orchard_muted'
const ZOOM       = 1.3     // the camera picture is shown (and mapped) this much larger than the screen, so you needn't stretch to reach the edges
const HOLD_MS    = 600     // how long a hand must be in view before the countdown starts
const SLOW_CAMERA = 20     // frames a second; below this, suggest more light
const LOST_MS    = 250     // fast slashes blur, and the tracker drops the hand for a frame or two — that's still one stroke

// Personal bests live in this browser only — no accounts, no database
const loadScores = () => {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]') } catch { return [] }
}
const saveScore = (score, mode) => {
  const all = [...loadScores(), { score, mode, at: new Date().toISOString() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(all)) } catch { /* private mode: not remembered */ }
  return all
}

const isPhone = () => window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches

// Where the camera picture sits on screen: covering it, then zoomed a little.
// The fingertip is mapped with the same numbers as the mirrored picture is drawn,
// so the blade sits exactly on your finger in the reflection.
function cameraBox(video, w, h) {
  const vw = video.videoWidth || 640, vh = video.videoHeight || 480
  const scale = Math.max(w / vw, h / vh) * ZOOM
  const dw = vw * scale, dh = vh * scale
  return { left: (w - dw) / 2, top: (h - dh) / 2, width: dw, height: dh }
}

const CAMERA_ERRORS = {
  NotAllowedError:  'The camera permission was declined. You can allow it from the camera icon in the address bar — or play with the mouse.',
  NotFoundError:    'No camera was found on this computer. You can still play with the mouse.',
  NotReadableError: 'The camera is busy in another app. Close it there and try again — or play with the mouse.',
}

function Corner({ className }) {
  return (
    <svg className={`orch-corner ${className}`} viewBox="0 0 160 160" aria-hidden="true">
      <path d="M6 154V62C6 30 30 6 62 6h92" />
      <path className="faint" d="M18 154V72c0-30 24-54 54-54h82" />
      <path d="M6 62c34 0 56-22 56-56" />
      <path className="faint" d="M62 62c-16 0-22-15-12-22 9-6 19 3 13 11" />
      <circle cx="62" cy="62" r="3.2" />
    </svg>
  )
}

// A life: a little gilded lily
function Lily({ on }) {
  return (
    <svg className={`orch-lily${on ? ' on' : ''}`} viewBox="0 0 32 36" aria-hidden="true">
      <path d="M16 3c4 6 4 13 0 19-4-6-4-13 0-19z" />
      <path d="M15 21C10 19 5 14 4 7c6 1 10 6 11 13z" />
      <path d="M17 21c5-2 10-7 11-14-6 1-10 6-11 13z" />
      <path className="stem" d="M16 22v11M16 29c-3-1-5-3-6-5M16 29c3-1 5-3 6-5" />
    </svg>
  )
}

function Ornament() {
  return (
    <div className="orch-ornament" aria-hidden="true">
      <span /><i>❦</i><span />
    </div>
  )
}

export default function Orchard() {
  const canvasRef  = useRef(null)
  const videoRef   = useRef(null)
  const engineRef  = useRef(null)
  const soundRef   = useRef(null)
  const streamRef  = useRef(null)
  const untrackRef = useRef(null)
  const handRef    = useRef(null)    // the hand on screen, or null
  const filtersRef = useRef(Array.from({ length: 21 }, () => ({ x: oneEuro(), y: oneEuro() })))
  const slowRef    = useRef(0)       // seconds in a row the camera has been slow
  const seenRef    = useRef(0)       // when the hand came into view (raise phase)
  const lostRef    = useRef(0)       // when the hand went out of view
  const phaseRef   = useRef('intro')
  const modeRef    = useRef(null)

  const [phase,   setPhaseState] = useState('intro')   // intro | loading | raise | countdown | playing | paused | over
  const [mode,    setMode]    = useState(null)          // hand | pointer
  const [score,   setScore]   = useState(0)
  const [lives,   setLives]   = useState(3)
  const [count,   setCount]   = useState(3)
  const [problem, setProblem] = useState('')
  const [handSeen, setHandSeen] = useState(false)
  const [scores,  setScores]  = useState(loadScores)
  const [result,  setResult]  = useState(null)
  const [muted,   setMuted]   = useState(() => localStorage.getItem(MUTE_KEY) === '1')
  const [phone] = useState(isPhone)
  const [stats, setStats] = useState(null)
  const [slowCamera, setSlowCamera] = useState(false)
  const [showStats] = useState(() => new URLSearchParams(window.location.search).has('stats'))

  const setPhase = useCallback((p) => { phaseRef.current = p; setPhaseState(p) }, [])

  /* ── Engine + page setup ──────────────────────────── */
  useEffect(() => {
    document.body.classList.add('page-game')
    const sound = createSound()
    soundRef.current = sound
    const engine = createOrchard(canvasRef.current, {
      sound,
      onScore: setScore,
      onLives: setLives,
      onOver: (final) => {
        const list = saveScore(final, modeRef.current)
        setScores(list)
        setResult({ score: final, best: list[0]?.score === final && final > 0 })
        setPhase('over')
      },
    })
    engineRef.current = engine
    const video = videoRef.current
    const placeVideo = () => {
      const b = cameraBox(video, window.innerWidth, window.innerHeight)
      Object.assign(video.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` })
    }
    const onResize = () => { engine.resize(); placeVideo() }
    window.addEventListener('resize', onResize)
    video.addEventListener('loadedmetadata', placeVideo)
    placeVideo()
    return () => {
      document.body.classList.remove('page-game')
      window.removeEventListener('resize', onResize)
      video.removeEventListener('loadedmetadata', placeVideo)
      engine.destroy()
      untrackRef.current?.()
      stopCamera(streamRef.current)
    }
  }, [setPhase])

  useEffect(() => {
    if (soundRef.current) soundRef.current.muted = muted
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch { /* not remembered */ }
  }, [muted])

  /* ── Countdown → play ─────────────────────────────── */
  const beginCountdown = useCallback(() => {
    setPhase('countdown')
    setCount(3)
    let n = 3
    const id = setInterval(() => {
      n -= 1
      if (n > 0) { setCount(n); return }
      clearInterval(id)
      setPhase('playing')
      engineRef.current.start()
    }, 800)
  }, [setPhase])

  /* ── Hand: all 21 points → the gilded hand, every fingertip a blade ── */
  const onHand = useCallback((points, at) => {
    const engine = engineRef.current
    const canvas = canvasRef.current
    if (!engine || !canvas) return
    if (!points) {
      const now = performance.now()
      if (!lostRef.current) lostRef.current = now
      if (now - lostRef.current > LOST_MS && handRef.current) {
        handRef.current = null
        seenRef.current = 0
        filtersRef.current.forEach((f) => { f.x.reset(); f.y.reset() })
        engine.lift()
        setHandSeen(false)
      }
      return
    }
    lostRef.current = 0
    // each point steadied when still, untouched when slashing
    const box = cameraBox(videoRef.current, canvas.clientWidth, canvas.clientHeight)
    const hand = points.map((p, i) => ({
      x: box.left + filtersRef.current[i].x.filter(p.x, at) * box.width,
      y: box.top + filtersRef.current[i].y.filter(p.y, at) * box.height,
    }))
    handRef.current = hand
    engine.aimHand(hand)
    setHandSeen(true)

    if (phaseRef.current === 'raise') {
      const now = performance.now()
      if (!seenRef.current) seenRef.current = now
      else if (now - seenRef.current > HOLD_MS) beginCountdown()
    }
  }, [beginCountdown])

  const playWithHand = async () => {
    soundRef.current.unlock()
    modeRef.current = 'hand'
    setMode('hand')
    setProblem('')
    setPhase('loading')
    try {
      if (!streamRef.current) streamRef.current = await startCamera(videoRef.current)
    } catch (e) {
      setProblem(CAMERA_ERRORS[e?.name] || 'The camera could not be started. You can still play with the mouse.')
      setPhase('intro')
      return
    }
    try {
      const tracker = await loadHandTracker()
      untrackRef.current?.()
      untrackRef.current = trackHand(videoRef.current, tracker, onHand, (s) => {
        setStats({ ...s, where: tracker.where, delegate: tracker.delegate, fps: engineRef.current?.fps })
        // A dim room makes laptop cameras slow down to let more light in — and
        // fewer frames means a laggier blade. Say so, rather than leave it a mystery.
        slowRef.current = s.cameraFps < SLOW_CAMERA ? slowRef.current + 1 : 0
        setSlowCamera(slowRef.current >= 3)
      })
    } catch {
      setProblem('The hand tracker could not be downloaded — check the connection and try again, or play with the mouse.')
      setPhase('intro')
      return
    }
    seenRef.current = 0
    setPhase('raise')
  }

  const playWithPointer = () => {
    soundRef.current.unlock()
    modeRef.current = 'pointer'
    setMode('pointer')
    setProblem('')
    untrackRef.current?.()
    untrackRef.current = null
    stopCamera(streamRef.current)
    streamRef.current = null
    beginCountdown()
  }

  const again = () => {
    setResult(null)
    if (modeRef.current === 'hand') { seenRef.current = 0; setPhase('raise') }
    else beginCountdown()
  }

  /* ── Mouse / finger: hold and slash ───────────────── */
  const pointer = {
    onPointerDown: (e) => {
      if (modeRef.current !== 'pointer') return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      engineRef.current.point(e.clientX, e.clientY)
    },
    onPointerMove: (e) => {
      if (modeRef.current !== 'pointer' || !(e.buttons & 1)) return
      for (const ev of e.nativeEvent.getCoalescedEvents?.() ?? [e]) engineRef.current.point(ev.clientX, ev.clientY)
    },
    onPointerUp:     () => { if (modeRef.current === 'pointer') engineRef.current.lift() },
    onPointerCancel: () => { if (modeRef.current === 'pointer') engineRef.current.lift() },
  }

  /* ── Pause: Escape, or leaving the tab ────────────── */
  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    engineRef.current.pause()
    setPhase('paused')
  }, [setPhase])
  const resume = () => {
    engineRef.current.resume()
    setPhase('playing')
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (phaseRef.current === 'playing') pause()
      else if (phaseRef.current === 'paused') resume()
    }
    const onHide = () => { if (document.hidden) pause() }
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [pause]) // eslint-disable-line react-hooks/exhaustive-deps

  const inRound = phase === 'playing' || phase === 'paused' || phase === 'countdown'
  const best = scores[0]?.score ?? 0

  return (
    <div className={`orchard${mode === 'hand' ? ' with-camera' : ''}`} data-phase={phase}>
      <video ref={videoRef} className="orch-video" playsInline muted aria-hidden="true" />
      <canvas ref={canvasRef} className={`orch-canvas${mode === 'pointer' ? ' pointer' : ''}`} {...pointer} />

      <div className="orch-frame" aria-hidden="true">
        <Corner className="tl" /><Corner className="tr" /><Corner className="bl" /><Corner className="br" />
      </div>

      {/* ── HUD ── */}
      {inRound && (
        <div className="orch-hud">
          <div className="orch-score">
            <span className="orch-hud-label">Score</span>
            <span className="orch-score-num">{score}</span>
          </div>
          <div className="orch-hud-mid">
            <button className="orch-icon" onClick={pause} aria-label="Pause" title="Pause (Esc)">❚❚</button>
            <button className="orch-icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Sound on' : 'Sound off'} title={muted ? 'Sound on' : 'Sound off'}>
              {muted ? '♪̸' : '♪'}
            </button>
          </div>
          <div className="orch-lives" aria-label={`${lives} lives left`}>
            {[0, 1, 2].map((i) => <Lily key={i} on={i < lives} />)}
          </div>
        </div>
      )}

      {mode === 'hand' && phase === 'playing' && !handSeen && (
        <div className="orch-hint">Show your hand to the camera</div>
      )}
      {mode === 'hand' && inRound && handSeen && slowCamera && (
        <div className="orch-hint quiet">
          Your camera is sending {stats?.cameraFps} frames a second — more light on your hand makes the blade quicker
        </div>
      )}
      {showStats && stats && mode === 'hand' && (
        <div className="orch-stats" aria-hidden="true">
          camera {stats.cameraFps} fps · tracker {stats.trackerFps}/s · {stats.trackerMs} ms ({stats.delegate}, {stats.where}) · game {stats.fps} fps
        </div>
      )}

      {/* ── Intro ── */}
      {(phase === 'intro' || phase === 'loading') && (
        <div className="orch-panel">
          <span className="orch-chapter">Chapter II</span>
          <h1 className="orch-title">The Orchard</h1>
          <Ornament />
          <p className="orch-lede">
            {phone
              ? 'Fruit is thrown up from below — swipe your finger across it to slice. Spare the scarabs.'
              : 'Raise a hand to your camera — your whole hand is the blade, every fingertip cuts. Fruit is thrown up from below: slash through it, and spare the scarabs.'}
          </p>
          <ul className="orch-rules">
            <li><b>✦ ✦ ✦</b> three lives — a fruit that falls unsliced costs one, and so does a scarab</li>
            <li><b>×3</b> slice three or more in one swipe for a combo</li>
          </ul>

          {problem && <p className="orch-problem" role="alert">{problem}</p>}

          {phase === 'loading' ? (
            <div className="orch-loading">
              <span className="orch-spinner" />
              <span>Waking the orchard… the first time takes a moment (the hand tracker is about 20&nbsp;MB)</span>
            </div>
          ) : (
            <div className="orch-actions">
              {!phone && <button className="orch-btn primary" onClick={playWithHand}>Play with your camera</button>}
              <button className={`orch-btn${phone ? ' primary' : ''}`} onClick={playWithPointer}>
                {phone ? 'Play with your finger' : 'Play with the mouse'}
              </button>
            </div>
          )}

          <p className="orch-fine">
            {phone
              ? 'Made for a computer with a webcam, where you slice with your hand in the air.'
              : 'Your camera picture stays on this computer — the hand tracking runs in your browser, and nothing is recorded or sent.'}
          </p>
          {best > 0 && <p className="orch-best">Your best: <b>{best}</b></p>}
          <Link to="/" className="orch-back">← back to the archive</Link>
        </div>
      )}

      {/* ── Waiting for a hand ── */}
      {phase === 'raise' && (
        <div className="orch-panel slim">
          <span className="orch-chapter">Ready</span>
          <h2 className="orch-title small">{handSeen ? 'Hold it there…' : 'Raise your hand'}</h2>
          <p className="orch-lede">
            Sit back a little so your whole hand fits in the picture, palm to the camera, fingers
            spread. Your hand appears in gold — every fingertip cuts.
          </p>
          <button className="orch-link" onClick={playWithPointer}>Use the mouse instead</button>
        </div>
      )}

      {phase === 'countdown' && <div className="orch-count" key={count}>{count}</div>}

      {phase === 'paused' && (
        <div className="orch-panel slim">
          <span className="orch-chapter">Paused</span>
          <h2 className="orch-title small">A moment’s rest</h2>
          <div className="orch-actions">
            <button className="orch-btn primary" onClick={resume}>Resume</button>
            <Link to="/" className="orch-btn">Leave the orchard</Link>
          </div>
        </div>
      )}

      {/* ── Game over ── */}
      {phase === 'over' && result && (
        <div className="orch-panel">
          <span className="orch-chapter">{result.best ? 'A new best' : 'The orchard rests'}</span>
          <div className="orch-final">{result.score}</div>
          <Ornament />
          {scores.length > 0 && (
            <ol className="orch-scores">
              {scores.map((s, i) => (
                <li key={s.at} className={s.score === result.score && i === scores.findIndex((x) => x.score === result.score) ? 'now' : ''}>
                  <span className="n">{i + 1}</span>
                  <span className="s">{s.score}</span>
                  <span className="d">{new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{s.mode === 'pointer' ? ' · mouse' : ''}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="orch-actions">
            <button className="orch-btn primary" onClick={again}>Play again</button>
            <Link to="/" className="orch-btn">Back to the archive</Link>
          </div>
          <p className="orch-fine">Scores are kept in this browser only.</p>
        </div>
      )}
    </div>
  )
}
