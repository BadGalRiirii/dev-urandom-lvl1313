import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createHourglass, PIGMENTS, SHAPES, W } from '../components/hourglass/engine'
import { createSound } from '../components/hourglass/sound'
import { Frame, Ornament } from '../components/orchard/Ornaments'
import './Orchard.css'
import './Hourglass.css'

const SCORES_KEY   = 'riri_hourglass_scores'
const MUTE_KEY     = 'riri_hourglass_muted'
const REPEAT_WAIT  = 150    // ms holding ← or → before the piece keeps sliding
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
// A light tap felt in the hand, on phones that can (iPhones can't, and simply don't)
const buzz = (pattern) => { try { navigator.vibrate?.(pattern) } catch { /* not allowed */ } }

/* ── Ornament ─────────────────────────────────────── */

// The arch over the well: a gilded crown with a half-sun of rays and a lily finial
function Crown() {
  const rays = Array.from({ length: 15 }, (_, i) => {
    const a = Math.PI + (Math.PI * (i + 0.5)) / 15
    return <line key={i} x1={150 + Math.cos(a) * 24} y1={92 + Math.sin(a) * 24} x2={150 + Math.cos(a) * 62} y2={92 + Math.sin(a) * 62} />
  })
  return (
    <svg className="hg-crown" viewBox="0 0 300 96" aria-hidden="true">
      <g className="rays">{rays}</g>
      <path className="sun" d="M132 92a18 18 0 0 1 36 0z" />
      <path d="M6 96V80C6 38 70 12 150 12s144 26 144 68v16" />
      <path className="faint" d="M20 96V84C20 50 78 26 150 26s130 24 130 58v12" />
      <path className="faint" d="M6 80c-4-12 4-24 16-20 8 3 6 14-2 13" />
      <path className="faint" d="M294 80c4-12-4-24-16-20-8 3-6 14 2 13" />
      <path className="lily" d="M150 1c4 5 4 10 0 14-4-4-4-9 0-14zM149 14c-5-1-9-4-10-9 5 1 9 4 10 9zM151 14c5-1 9-4 10-9-5 1-9 4-10 9z" />
    </svg>
  )
}

// The plinth under the well: two gilded rules and whiplash curls meeting at a lily
function Plinth() {
  return (
    <svg className="hg-plinth" viewBox="0 0 300 52" aria-hidden="true">
      <path d="M0 4h300" />
      <path className="faint" d="M14 11h272" />
      <path d="M150 20c-14 0-22 10-44 10-18 0-30-8-24-16 4-5 12-2 10 4" />
      <path d="M150 20c14 0 22 10 44 10 18 0 30-8 24-16-4-5-12-2-10 4" />
      <path className="faint" d="M106 30c-30 0-46 6-70 6M194 30c30 0 46 6 70 6" />
      <path className="lily" d="M150 22c4 6 4 13 0 19-4-6-4-13 0-19zM149 38c-6-1-11-5-12-11 6 1 11 5 12 11zM151 38c6-1 11-5 12-11-6 1-11 5-12 11z" />
    </svg>
  )
}

// A great slow-turning nimbus behind the glass
function Halo() {
  const rays = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2
    const r0 = i % 2 ? 128 : 116
    return <line key={i} x1={200 + Math.cos(a) * r0} y1={200 + Math.sin(a) * r0} x2={200 + Math.cos(a) * 186} y2={200 + Math.sin(a) * 186} />
  })
  return (
    <svg className="hg-halo" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="192" />
      <circle className="faint" cx="200" cy="200" r="186" />
      <circle className="faint" cx="200" cy="200" r="112" />
      <circle cx="200" cy="200" r="104" />
      <g className="rays">{rays}</g>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2
        return <circle key={i} className="bead" cx={200 + Math.cos(a) * 96} cy={200 + Math.sin(a) * 96} r="2.2" />
      })}
    </svg>
  )
}

// Gold dust drifting up through the dark, very slowly
function Motes() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0, h = 0, raf = 0, last = performance.now()
    const size = () => { w = c.width = Math.round(c.clientWidth * dpr); h = c.height = Math.round(c.clientHeight * dpr) }
    size()
    const motes = Array.from({ length: 46 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8,
      v: 0.004 + Math.random() * 0.012, sway: Math.random() * 6.28, a: 0.15 + Math.random() * 0.45,
    }))
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        if (!still) {
          m.y -= m.v * dt
          m.sway += dt * 0.5
          if (m.y < -0.02) { m.y = 1.02; m.x = Math.random() }
        }
        const x = (m.x + Math.sin(m.sway) * 0.008) * w, y = m.y * h
        const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 3 * dpr)
        g.addColorStop(0, `rgba(243, 220, 147, ${m.a})`)
        g.addColorStop(1, 'rgba(243, 220, 147, 0)')
        ctx.fillStyle = g
        ctx.fillRect(x - m.r * 3 * dpr, y - m.r * 3 * dpr, m.r * 6 * dpr, m.r * 6 * dpr)
      }
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', size)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])
  return <canvas ref={ref} className="hg-motes" aria-hidden="true" />
}

// A piece shown small, as stained glass — for Next and Hold
function Piece({ piece }) {
  if (!piece) return <div className="hg-piece empty" />
  const rows = SHAPES[piece.shape].filter((r) => r.some(Boolean))
  const cols = rows[0].map((_, x) => rows.some((r) => r[x]))
  const s = PIGMENTS[piece.pig].shades
  return (
    <div className="hg-piece" style={{ gridTemplateColumns: `repeat(${cols.filter(Boolean).length}, 1fr)` }}>
      {rows.flatMap((r, y) => r.filter((_, x) => cols[x]).map((v, x) => (
        <span key={`${y}-${x}`} className={v ? 'on' : ''}
              style={v ? { background: `linear-gradient(135deg, ${s[3]}, ${s[2]} 45%, ${s[1]})` } : undefined} />
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
  const sandRef   = useRef(null)
  const fxRef     = useRef(null)
  const wellRef   = useRef(null)
  const engineRef = useRef(null)
  const soundRef  = useRef(null)
  const phaseRef  = useRef('intro')
  const bridgesRef = useRef(0)
  const repeatRef = useRef({})     // key → timers, for holding ← →
  const dragRef   = useRef(null)
  const popIdRef  = useRef(0)

  const [phase,   setPhaseState] = useState('intro')   // intro | countdown | playing | paused | over
  const [score,   setScore]   = useState(0)
  const [level,   setLevel]   = useState(1)
  const [bridges, setBridges] = useState(0)
  const [next,    setNext]    = useState(null)
  const [held,    setHeld]    = useState(null)
  const [count,   setCount]   = useState(3)
  const [pops,    setPops]    = useState([])            // points floating up from a clear
  const [whisper, setWhisper] = useState(null)          // "Level 3", briefly
  const [glow,    setGlow]    = useState(0)             // bumps on each clear, to pulse the walls
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
    const engine = createHourglass({ sandCanvas: sandRef.current, fxCanvas: fxRef.current }, {
      sound,
      onScore: setScore,
      onLevel: (l) => {
        setLevel(l)
        if (l > 1) { setWhisper(l); setTimeout(() => setWhisper((w) => (w === l ? null : w)), 2400) }
      },
      onBridges: (b) => { bridgesRef.current = b; setBridges(b) },
      onNext: setNext,
      onHold: setHeld,
      onLand: (dropped) => buzz(dropped ? 14 : 6),
      onClear: ({ points, chain, x, y }) => {
        const id = ++popIdRef.current
        setPops((p) => [...p, { id, points, chain, x, y }])
        setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 1800)
        setGlow((g) => g + 1)
        buzz(chain > 1 ? [16, 50, 16, 50, 24] : [16, 60, 22])
      },
      onOver: (final) => {
        const list = saveScore(final, bridgesRef.current)
        setScores(list)
        setResult({ score: final, bridges: bridgesRef.current, best: list[0]?.score === final && final > 0 })
        setTimeout(() => setPhase('over'), 1400)    // a moment to see the heap that ended it
      },
    })
    engineRef.current = engine
    const ro = new ResizeObserver(() => engine.resize())
    ro.observe(wellRef.current)
    const repeats = repeatRef.current
    return () => {
      document.body.classList.remove('page-game')
      ro.disconnect()
      engine.destroy()
      sound.music(false)
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
    setPops([])
    setPhase('countdown')
    setCount(3)
    soundRef.current.music(true)
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
    soundRef.current.music(false)
    setPhase('paused')
  }, [setPhase])
  const resume = useCallback(() => {
    engineRef.current.resume()
    soundRef.current.music(true)
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
    const eng = () => engineRef.current
    const onDown = (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phaseRef.current === 'playing') pause()
        else if (phaseRef.current === 'paused') resume()
        return
      }
      if (phaseRef.current !== 'playing') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const act = {
        ArrowLeft: () => hold('left', () => eng().left()),   a: () => hold('left', () => eng().left()),
        ArrowRight: () => hold('right', () => eng().right()), d: () => hold('right', () => eng().right()),
        ArrowUp: () => eng().turn(1), x: () => eng().turn(1), w: () => eng().turn(1),
        z: () => eng().turn(-1), q: () => eng().turn(-1),
        ArrowDown: () => eng().softDrop(true), s: () => eng().softDrop(true),
        ' ': () => eng().hardDrop(),
        c: () => eng().hold(), Shift: () => eng().hold(),
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
      if (k === 'ArrowDown' || k === 's') eng().softDrop(false)
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

  const holdPiece = () => { if (phaseRef.current === 'playing') engineRef.current.hold() }

  const inRound = phase === 'playing' || phase === 'paused' || phase === 'countdown'
  const best = scores[0]?.score ?? 0

  return (
    <div className={`orchard hourglass${touch ? ' touch' : ''}`} data-phase={phase}>
      <Motes />
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

        <div className={`hg-shrine glow-${glow % 2}`}>
          <Halo />
          <Crown />
          <div className="hg-well" ref={wellRef} {...well}>
            <canvas ref={sandRef} className="hg-sand" aria-label="The well of sand" />
            <canvas ref={fxRef} className="hg-fx" aria-hidden="true" />
            {pops.map((p) => (
              <div key={p.id} className="hg-pop" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
                <span className="pts">+{p.points}</span>
                {p.chain > 1 && <span className="chain">×{p.chain} in a row</span>}
              </div>
            ))}
            {whisper && phase === 'playing' && (
              <div className="hg-whisper" key={whisper}>
                <span className="orch-chapter">Level</span>
                <span className="n">{whisper}</span>
                <span className="sub">the sand runs a little faster</span>
              </div>
            )}
          </div>
          <Plinth />
        </div>

        <div className="hg-side hg-right">
          <div className="hg-stat">
            <span className="orch-hud-label">Next</span>
            <Piece piece={next} />
          </div>
          <button className="hg-stat hg-hold" onClick={holdPiece} aria-label="Hold this piece for later" title="Hold (C)">
            <span className="orch-hud-label">Hold</span>
            <Piece piece={held} />
          </button>
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
              <dt>space</dt><dd>let it fall</dd>
              <dt>C</dt><dd>hold for later</dd>
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
            Panes of coloured glass drift down, and the moment each one settles it crumbles into sand.
          </p>
          <ul className="orch-rules">
            <li><b>⟷</b> join one colour from the left wall to the right, and it lifts away as gold</li>
            <li><b>×2</b> a clear that sets off another counts double</li>
            <li><b>✦</b> the glass is full when the sand reaches the top</li>
          </ul>
          <div className="orch-actions">
            <button className="orch-btn primary" onClick={begin}>Turn the glass</button>
          </div>
          <p className="orch-fine">
            {touch
              ? 'Drag the glass to move, tap to turn, flick down to let it fall — or use the buttons. Tap Hold to keep a piece for later.'
              : 'Arrows to move and turn, space to let it fall, C to hold one for later. The mouse can drag it too.'}
          </p>
          {best > 0 && <p className="orch-best">Your best: <b>{best}</b></p>}
          <Link to="/" className="orch-back">← back to the archive</Link>
        </div>
      )}

      {phase === 'countdown' && <div className="orch-count hg-count" key={count}>{count}</div>}

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
            <button className="orch-btn primary" onClick={begin}>Turn it again</button>
            <Link to="/" className="orch-btn">Back to the archive</Link>
          </div>
          <p className="orch-fine">Scores are kept in this browser only.</p>
        </div>
      )}

      {inRound && phase !== 'playing' && <div className="hg-dim" aria-hidden="true" />}
    </div>
  )
}
