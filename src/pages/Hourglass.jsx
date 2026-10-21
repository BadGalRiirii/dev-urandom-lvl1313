import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createHourglass, PIGMENTS, SHAPES, W } from '../components/hourglass/engine'
import { createSound } from '../components/orchard/sound'
import { Frame, Ornament } from '../components/orchard/Ornaments'
import './Orchard.css'
import './Hourglass.css'

const SCORES_KEY = 'riri_hourglass_scores'
const MUTE_KEY   = 'riri_hourglass_muted'
const REPEAT_WAIT = 150    // ms holding ← or → before the piece keeps sliding
const REPEAT_EVERY = 45

// Personal bests live in this browser only — no accounts, no database
const loadScores = () => {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]') } catch { return [] }
}
const saveScore = (score, bridges) => {
  const all = [...loadScores(), { score, bridges, at: new Date().toISOString() }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(all)) } catch { /* private mode: not remembered */ }
  return all
}

const isTouch = () => window.matchMedia('(pointer: coarse)').matches

// The next piece, trimmed to its blocks, in its colour
function NextPiece({ next }) {
  if (!next) return <div className="hg-next-piece" />
  const rows = SHAPES[next.shape].filter((r) => r.some(Boolean))
  const cols = rows[0].map((_, x) => rows.some((r) => r[x]))
  const shades = PIGMENTS[next.pig].shades
  return (
    <div className="hg-next-piece" style={{ gridTemplateColumns: `repeat(${cols.filter(Boolean).length}, 1fr)` }}>
      {rows.flatMap((r, y) => r.filter((_, x) => cols[x]).map((v, x) => (
        <span key={`${y}-${x}`} className={v ? 'on' : ''}
              style={v ? { background: `linear-gradient(135deg, ${shades[3]}, ${shades[1]} 60%, ${shades[0]})` } : undefined} />
      )))}
    </div>
  )
}

function PadButton({ action, repeat = false, onPress, onRelease, label, className, children }) {
  const up = () => onRelease(action)
  return (
    <button
      className={className}
      aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); onPress(action, repeat) }}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

export default function Hourglass() {
  const canvasRef = useRef(null)
  const wellRef   = useRef(null)
  const engineRef = useRef(null)
  const soundRef  = useRef(null)
  const phaseRef  = useRef('intro')
  const bridgesRef = useRef(0)
  const repeatRef = useRef({})     // key → timers, for holding ← →
  const dragRef   = useRef(null)

  const [phase,   setPhaseState] = useState('intro')   // intro | countdown | playing | paused | over
  const [score,   setScore]   = useState(0)
  const [level,   setLevel]   = useState(1)
  const [bridges, setBridges] = useState(0)
  const [next,    setNext]    = useState(null)
  const [count,   setCount]   = useState(3)
  const [scores,  setScores]  = useState(loadScores)
  const [result,  setResult]  = useState(null)
  const [muted,   setMuted]   = useState(() => localStorage.getItem(MUTE_KEY) === '1')
  const [touch] = useState(isTouch)

  const setPhase = useCallback((p) => { phaseRef.current = p; setPhaseState(p) }, [])

  /* ── Engine + page setup ──────────────────────────── */
  useEffect(() => {
    document.body.classList.add('page-game')
    const sound = createSound()
    soundRef.current = sound
    engineRef.current = createHourglass(canvasRef.current, {
      sound,
      onScore: setScore,
      onLevel: setLevel,
      onBridges: (b) => { bridgesRef.current = b; setBridges(b) },
      onNext: setNext,
      onOver: (final) => {
        const list = saveScore(final, bridgesRef.current)
        setScores(list)
        setResult({ score: final, bridges: bridgesRef.current, best: list[0]?.score === final && final > 0 })
        setTimeout(() => setPhase('over'), 900)    // a moment to see the heap that ended it
      },
    })
    const repeats = repeatRef.current
    return () => {
      document.body.classList.remove('page-game')
      engineRef.current.destroy()
      Object.values(repeats).forEach(clearInterval)
    }
  }, [setPhase])

  useEffect(() => {
    if (soundRef.current) soundRef.current.muted = muted
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch { /* not remembered */ }
  }, [muted])

  /* ── Countdown → play ─────────────────────────────── */
  const begin = useCallback(() => {
    soundRef.current.unlock()
    setResult(null)
    setPhase('countdown')
    setCount(3)
    let n = 3
    const id = setInterval(() => {
      n -= 1
      if (n > 0) { setCount(n); return }
      clearInterval(id)
      setPhase('playing')
      engineRef.current.start()
    }, 700)
  }, [setPhase])

  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    engineRef.current.pause()
    engineRef.current.softDrop(false)
    setPhase('paused')
  }, [setPhase])
  const resume = useCallback(() => {
    engineRef.current.resume()
    setPhase('playing')
  }, [setPhase])

  /* ── Holding ← → slides the piece along ───────────── */
  const hold = useCallback((name, fn) => {
    const timers = repeatRef.current
    if (timers[name]) return
    fn()
    timers[name] = setTimeout(() => { timers[name] = setInterval(fn, REPEAT_EVERY) }, REPEAT_WAIT)
  }, [])
  const release = useCallback((name) => {
    const timers = repeatRef.current
    clearTimeout(timers[name]); clearInterval(timers[name])
    delete timers[name]
  }, [])

  /* ── Keyboard ─────────────────────────────────────── */
  useEffect(() => {
    const e_ = () => engineRef.current
    const onDown = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phaseRef.current === 'playing') pause()
        else if (phaseRef.current === 'paused') resume()
        return
      }
      if (phaseRef.current !== 'playing') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const act = {
        ArrowLeft: () => hold('left', () => e_().left()),  a: () => hold('left', () => e_().left()),
        ArrowRight: () => hold('right', () => e_().right()), d: () => hold('right', () => e_().right()),
        ArrowUp: () => e_().turn(1), x: () => e_().turn(1), w: () => e_().turn(1),
        z: () => e_().turn(-1), q: () => e_().turn(-1),
        ArrowDown: () => e_().softDrop(true), s: () => e_().softDrop(true),
        ' ': () => e_().hardDrop(),
      }[k]
      if (!act) return
      e.preventDefault()
      if (e.repeat) return          // holding is handled here, not by the keyboard's own repeat
      act()
    }
    const onUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === 'ArrowLeft' || k === 'a') release('left')
      if (k === 'ArrowRight' || k === 'd') release('right')
      if (k === 'ArrowDown' || k === 's') e_().softDrop(false)
    }
    const onHide = () => { if (document.hidden) pause() }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [pause, resume, hold, release])

  /* ── Touch (or mouse) on the well: drag to move, tap to turn, flick down to drop ── */
  const well = {
    onPointerDown: (e) => {
      if (phaseRef.current !== 'playing') return
      e.currentTarget.setPointerCapture?.(e.pointerId)
      const eng = engineRef.current
      dragRef.current = { x: e.clientX, y: e.clientY, t: performance.now(), px: eng.pieceX(), id: eng.pieceId(), moved: false }
    },
    onPointerMove: (e) => {
      const d = dragRef.current, eng = engineRef.current
      if (!d || phaseRef.current !== 'playing') return
      if (eng.pieceId() !== d.id) Object.assign(d, { x: e.clientX, px: eng.pieceX(), id: eng.pieceId() })   // that one landed: carry on with the next
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) d.moved = true
      if (d.px !== null) eng.slideTo(d.px + Math.round(dx / (wellRef.current.clientWidth / W)))
      eng.softDrop(dy > 30 && dy > Math.abs(dx) * 1.2)
    },
    onPointerUp: (e) => {
      const d = dragRef.current
      dragRef.current = null
      const eng = engineRef.current
      eng.softDrop(false)
      if (!d || phaseRef.current !== 'playing') return
      const dy = e.clientY - d.y, ms = performance.now() - d.t
      if (!d.moved && ms < 350) eng.turn(1)
      else if (dy > 50 && dy / ms > 0.7 && dy > Math.abs(e.clientX - d.x)) eng.hardDrop()
    },
    onPointerCancel: () => { dragRef.current = null; engineRef.current.softDrop(false) },
  }

  // Phone buttons: press and hold ← → to keep sliding
  const press = useCallback((action, repeat) => {
    if (phaseRef.current !== 'playing') return
    const act = () => {
      const eng = engineRef.current
      if (action === 'cw') eng.turn(1)
      else if (action === 'ccw') eng.turn(-1)
      else eng[action]()
    }
    if (repeat) hold(action, act)
    else act()
  }, [hold])

  const inRound = phase === 'playing' || phase === 'paused' || phase === 'countdown'
  const best = scores[0]?.score ?? 0

  return (
    <div className={`orchard hourglass${touch ? ' touch' : ''}`} data-phase={phase}>
      <Frame />

      <div className="hg-stage">
        <div className="hg-side hg-left">
          <div className="hg-stat big">
            <span className="orch-hud-label">Score</span>
            <span className="hg-num">{score}</span>
          </div>
          <div className="hg-stat">
            <span className="orch-hud-label">Level</span>
            <span className="hg-num small">{level}</span>
          </div>
          <div className="hg-stat bridges">
            <span className="orch-hud-label">Bridges</span>
            <span className="hg-num small">{bridges}</span>
          </div>
        </div>

        <div className="hg-well" ref={wellRef} {...well}>
          <canvas ref={canvasRef} className="hg-canvas" aria-label="The well of sand" />
        </div>

        <div className="hg-side hg-right">
          <div className="hg-stat">
            <span className="orch-hud-label">Next</span>
            <NextPiece next={next} />
          </div>
          <div className="hg-icons">
            <button className="orch-icon" onClick={pause} disabled={phase !== 'playing'} aria-label="Pause" title="Pause (Esc)">❚❚</button>
            <button className="orch-icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Sound on' : 'Sound off'} title={muted ? 'Sound on' : 'Sound off'}>
              {muted ? '♪̸' : '♪'}
            </button>
          </div>
          {!touch && (
            <dl className="hg-keys">
              <dt>← →</dt><dd>move</dd>
              <dt>↑ / X</dt><dd>turn · Z the other way</dd>
              <dt>↓</dt><dd>fall faster</dd>
              <dt>space</dt><dd>drop</dd>
              <dt>esc</dt><dd>pause</dd>
            </dl>
          )}
        </div>
      </div>

      {touch && (
        <div className="hg-pad" aria-label="Controls">
          <PadButton action="left" repeat onPress={press} onRelease={release} label="Move left">◀</PadButton>
          <PadButton action="ccw" onPress={press} onRelease={release} label="Turn left">⟲</PadButton>
          <PadButton action="hardDrop" onPress={press} onRelease={release} label="Drop" className="drop">⤓</PadButton>
          <PadButton action="cw" onPress={press} onRelease={release} label="Turn right">⟳</PadButton>
          <PadButton action="right" repeat onPress={press} onRelease={release} label="Move right">▶</PadButton>
        </div>
      )}

      {/* ── Intro ── */}
      {phase === 'intro' && (
        <div className="orch-panel">
          <span className="orch-chapter">Game Mode</span>
          <h1 className="orch-title">The Hourglass</h1>
          <Ornament />
          <p className="orch-lede">
            Blocks fall as they always have — but the moment one lands, it crumbles into sand.
          </p>
          <ul className="orch-rules">
            <li><b>⟷</b> clear sand by joining one colour from the left wall to the right</li>
            <li><b>×2</b> clears that set off another, back to back, count double</li>
            <li><b>✦</b> it ends when the sand reaches the top</li>
          </ul>
          <div className="orch-actions">
            <button className="orch-btn primary" onClick={begin}>Turn the glass</button>
          </div>
          <p className="orch-fine">
            {touch
              ? 'Drag the well to move, tap it to turn, flick down to drop — or use the buttons below.'
              : 'Arrow keys to move and turn, space to drop. Or drag the piece with the mouse.'}
          </p>
          {best > 0 && <p className="orch-best">Your best: <b>{best}</b></p>}
          <Link to="/" className="orch-back">← back to the archive</Link>
        </div>
      )}

      {phase === 'countdown' && <div className="orch-count" key={count}>{count}</div>}

      {phase === 'paused' && (
        <div className="orch-panel slim">
          <span className="orch-chapter">Paused</span>
          <h2 className="orch-title small">The sand waits</h2>
          <div className="orch-actions">
            <button className="orch-btn primary" onClick={resume}>Resume</button>
            <Link to="/" className="orch-btn">Leave</Link>
          </div>
        </div>
      )}

      {/* ── Game over ── */}
      {phase === 'over' && result && (
        <div className="orch-panel">
          <span className="orch-chapter">{result.best ? 'A new best' : 'The glass is full'}</span>
          <div className="orch-final">{result.score}</div>
          <p className="orch-best">{result.bridges} {result.bridges === 1 ? 'bridge' : 'bridges'}</p>
          <Ornament />
          {scores.length > 0 && (
            <ol className="orch-scores">
              {scores.map((s, i) => (
                <li key={s.at} className={s.score === result.score && i === scores.findIndex((x) => x.score === result.score) ? 'now' : ''}>
                  <span className="n">{i + 1}</span>
                  <span className="s">{s.score}</span>
                  <span className="d">{new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="orch-actions">
            <button className="orch-btn primary" onClick={begin}>Play again</button>
            <Link to="/" className="orch-btn">Back to the archive</Link>
          </div>
          <p className="orch-fine">Scores are kept in this browser only.</p>
        </div>
      )}

      {inRound && phase !== 'playing' && <div className="hg-dim" aria-hidden="true" />}
    </div>
  )
}
