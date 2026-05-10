import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import cd1  from '../../assets/cds/cd1.jpg'
import cd2  from '../../assets/cds/cd2.jpg'
import cd3  from '../../assets/cds/cd3.jpg'
import cd4  from '../../assets/cds/cd4.jpg'
import cd5  from '../../assets/cds/cd5.jpg'
import cd6  from '../../assets/cds/cd6.jpg'
import cd7  from '../../assets/cds/cd7.jpg'
import cd8  from '../../assets/cds/cd8.jpg'
import cd9  from '../../assets/cds/cd9.jpg'
import cd10 from '../../assets/cds/cd10.jpg'
import cd11 from '../../assets/cds/cd11.jpg'
import cd12 from '../../assets/cds/cd12.jpg'
import cd13 from '../../assets/cds/cd13.jpg'
import './RecordCarousel.css'

const CD_IMAGES = [cd1,cd2,cd3,cd4,cd5,cd6,cd7,cd8,cd9,cd10,cd11,cd12,cd13]

function getCoverImage(track, index) {
  let n = track?.cd_image
  if (!n && typeof track?.cover_color === 'string' && track.cover_color.startsWith('cd:')) {
    n = parseInt(track.cover_color.slice(3), 10)
  }
  if (n >= 1 && n <= CD_IMAGES.length) return CD_IMAGES[n - 1]
  return CD_IMAGES[index % CD_IMAGES.length]
}

const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function RecordCarousel({
  tracks, onPlay, onPause, onResume, onEject, isAudioPlaying,
  audioProgress, audioDuration, onRegisterEnded, onSeek, analyserNode,
}) {
  const [center,   setCenter]   = useState(0)
  const [playing,  setPlaying]  = useState(null)
  const [shuffle,  setShuffle]  = useState(false)
  const [loop,     setLoop]     = useState(false)
  const [ejecting, setEjecting] = useState(false)

  const rackRef        = useRef(null)
  const lastScrollTime = useRef(0)
  const eqRef          = useRef(null)

  const count         = tracks.length
  const selectedTrack = tracks[center]
  const playingTrack  = playing !== null ? tracks[playing] : null
  const playingIdx    = playing !== null ? playing : 0
  const progressPct   = audioDuration ? (audioProgress / audioDuration) * 100 : 0

  // ── Live EQ via Web Audio API ──────────────────────────
  useEffect(() => {
    if (!analyserNode) return
    const bufLen = analyserNode.frequencyBinCount
    const data   = new Uint8Array(bufLen)
    let rafId

    const tick = () => {
      analyserNode.getByteFrequencyData(data)
      const bars     = eqRef.current?.children
      const barCount = bars?.length ?? 0
      for (let i = 0; i < barCount; i++) {
        // Map bar to lower 80% of spectrum (musical content is mostly there)
        const binIdx = Math.floor((i / barCount) * (bufLen * 0.8))
        const val    = data[binIdx] / 255
        // Below noise floor → fully invisible so no dash artifacts
        if (val < 0.03) {
          bars[i].style.height  = '0px'
          bars[i].style.opacity = '0'
        } else {
          const h = Math.max(3, Math.round(val * 42))
          bars[i].style.height  = `${h}px`
          bars[i].style.opacity = `${Math.min(1, val * 1.1 + 0.08)}`
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      const bars = eqRef.current?.children
      if (bars) {
        for (const bar of bars) {
          bar.style.height  = '0px'
          bar.style.opacity = '0'
        }
      }
    }
  }, [analyserNode])

  const getOffset = (i) => {
    let d = i - center
    if (d >  count / 2) d -= count
    if (d < -count / 2) d += count
    return d
  }

  // ── Wheel navigation (carousel scroll only) ──
  const wheelPrev = useCallback(() => setCenter(c => (c - 1 + count) % count), [count])
  const wheelNext = useCallback(() => setCenter(c => (c + 1) % count), [count])

  useEffect(() => {
    const el = rackRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const now = Date.now()
      if (now - lastScrollTime.current < 380) return
      lastScrollTime.current = now
      if (e.deltaY > 0) wheelNext(); else wheelPrev()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [wheelNext, wheelPrev])

  // ── Skip helpers ──
  const randomIdx = useCallback((exclude) => {
    if (count <= 1) return 0
    let idx
    do { idx = Math.floor(Math.random() * count) } while (idx === exclude)
    return idx
  }, [count])

  const skipNext = useCallback(() => {
    const from    = playing !== null ? playing : center
    const nextIdx = shuffle ? randomIdx(from) : (from + 1) % count
    setCenter(nextIdx)
    if (playing !== null) {
      setPlaying(nextIdx)
      onPlay?.({ ...tracks[nextIdx], coverImage: getCoverImage(tracks[nextIdx], nextIdx) })
    }
  }, [playing, center, shuffle, count, randomIdx, tracks, onPlay])

  const skipPrev = useCallback(() => {
    const from    = playing !== null ? playing : center
    const prevIdx = shuffle ? randomIdx(from) : (from - 1 + count) % count
    setCenter(prevIdx)
    if (playing !== null) {
      setPlaying(prevIdx)
      onPlay?.({ ...tracks[prevIdx], coverImage: getCoverImage(tracks[prevIdx], prevIdx) })
    }
  }, [playing, center, shuffle, count, randomIdx, tracks, onPlay])

  // ── Auto-advance / loop on track end ──
  useEffect(() => {
    if (!onRegisterEnded) return
    onRegisterEnded(() => {
      if (loop && playing !== null) {
        const t = tracks[playing]
        onPlay?.({ ...t, coverImage: getCoverImage(t, playing) })
      } else if (playing !== null) {
        const nextIdx = shuffle ? randomIdx(playing) : (playing + 1) % count
        setCenter(nextIdx)
        setPlaying(nextIdx)
        onPlay?.({ ...tracks[nextIdx], coverImage: getCoverImage(tracks[nextIdx], nextIdx) })
      }
    })
  }, [loop, shuffle, playing, count, tracks, randomIdx, onPlay, onRegisterEnded])

  // ── Play ──
  const playWithCover = (t, idx) => {
    if (!t) return
    setPlaying(idx)
    onPlay?.({ ...t, coverImage: getCoverImage(t, idx) })
  }

  const handlePlayButton = () => {
    if (playing === null)   playWithCover(selectedTrack, center)
    else if (isAudioPlaying) onPause?.()
    else                     onResume?.()
  }

  // ── Eject ──
  const handleEject = () => {
    if (playing === null && !ejecting) return
    setEjecting(true)
    setTimeout(() => { setPlaying(null); setEjecting(false); onEject?.() }, 480)
  }

  const handleProgressClick = (e) => {
    if (!audioDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek?.((e.clientX - rect.left) / rect.width)
  }

  const spinning = isAudioPlaying && !ejecting
  const hasDisc  = playing !== null
  const eqActive = isAudioPlaying && !ejecting

  return (
    <div className="cd-player">

      {/* ── Left rack ── */}
      <div className="cd-stack-col">
        <div className="cd-rack-scene" ref={rackRef}>
          {tracks.map((t, i) => {
            const offset   = getOffset(i)
            const abs      = Math.abs(offset)
            if (abs > 3) return null
            const isActive = i === center
            // Spine label: bright for active, dimmer for adjacent
            const spineOpacity = isActive ? 1 : Math.max(0, 0.32 - abs * 0.14)

            return (
              <motion.button
                key={t.id}
                className={`cd-card-wrap${isActive ? ' cd-card-wrap--active' : ''}`}
                style={{ zIndex: isActive ? 30 : 30 - abs }}
                animate={{
                  y:       offset * 96,
                  rotateX: offset * -11,
                  scale:   isActive ? 1.06 : Math.max(0.72, 1 - abs * 0.1),
                  opacity: Math.max(0.2, 1 - abs * 0.28),
                }}
                whileHover={!isActive ? {
                  scale:   Math.max(0.76, 1 - abs * 0.1) * 1.05,
                  opacity: 0.6,
                  transition: { type: 'spring', stiffness: 400, damping: 22 },
                } : {}}
                transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                onClick={() => isActive ? playWithCover(t, i) : setCenter(i)}
                title={t.title}
              >
                {/* Case image */}
                <div className="cd-card-inner">
                  <img
                    src={getCoverImage(t, i)}
                    alt={t.title}
                    className={`cd-card-img${isActive ? ' cd-card-img--active' : ''}`}
                  />
                  <div className="cd-card-glare" />
                  {isActive && <div className="cd-card-active-ring" />}
                </div>

                {/* Spine label — floats to the RIGHT of the case */}
                <div className="cd-card-spine" style={{ opacity: spineOpacity }}>
                  <span className={`cd-card-spine-title mono${isActive ? ' cd-card-spine-title--active' : ''}`}>
                    {t.title}
                  </span>
                  {t.artist && (
                    <span className="cd-card-spine-artist mono">{t.artist}</span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Device ── */}
      <div className={`cd-device${hasDisc ? ' cd-device--playing' : ''}`}>

        {/* Header */}
        <div className="cd-dev-header">
          <span className="cd-dev-brand mono">RIRI·DEV</span>
          <div className="cd-dev-leds">
            <div className="cd-dev-led cd-dev-led--pwr"><span className="mono">PWR</span></div>
            <div className={`cd-dev-led${eqActive ? ' cd-dev-led--rec-on' : ' cd-dev-led--rec'}`}>
              <span className="mono">REC</span>
            </div>
            <div className="cd-dev-led cd-dev-led--sys"><span className="mono">SYS</span></div>
          </div>
          <span className="cd-dev-model mono">CD SYSTEM Mk.II</span>
        </div>

        {/* Body: disc | LCD */}
        <div className="cd-dev-body">

          {/* Disc window */}
          <div className="cd-dev-disc-col">
            <div className={`cd-dev-window-shell${eqActive ? ' cd-dev-window-shell--playing' : ''}`}>
              <div className={`cd-dev-window${eqActive ? ' cd-dev-window--playing' : ''}`}>
                <div className="cd-dev-window-ring" />
                <AnimatePresence mode="wait">
                  {hasDisc && (
                    <motion.div
                      key={playingIdx}
                      className="cd-disc-wrap"
                      style={{ borderRadius: '50%', overflow: 'hidden', width: 200, height: 200 }}
                      initial={{ opacity: 0, scale: 0.88, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.92, rotate: 5, transition: { duration: 0.25 } }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <img
                        src={getCoverImage(playingTrack, playingIdx)}
                        alt={playingTrack?.title ?? 'CD'}
                        className={`cd-disc-img${spinning ? ' spinning' : ''}${ejecting ? ' ejecting' : ''}`}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="cd-dev-spindle" />
                <div className={`cd-dev-scan${spinning ? ' scanning' : ''}`} />
              </div>
            </div>
          </div>

          {/* LCD info */}
          <div className="cd-dev-info-col">
            <div className="cd-lcd">
              <div className="cd-lcd-scanlines" />

              <div className="cd-lcd-row cd-lcd-top mono">
                <span>◈ {eqActive ? 'NOW PLAYING' : hasDisc ? 'PAUSED' : 'READY'}</span>
                <span className="cd-lcd-blink">■</span>
              </div>

              {/* Infinite scrolling ticker */}
              <div className="cd-lcd-body">
                <div className="cd-lcd-title-wrap">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={playing ?? 'none'}
                      className={`cd-lcd-title mono${playingTrack ? ' scrolling' : ''}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {playingTrack
                        ? `${playingTrack.title}      ${playingTrack.title}`
                        : '---'}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="cd-lcd-artist mono">
                  {playingTrack?.artist ?? '---'}
                </div>
              </div>

              {/* Seekable progress */}
              <div className="cd-progress-wrap">
                <div
                  className="cd-progress-bar"
                  onClick={handleProgressClick}
                  style={{ cursor: hasDisc ? 'pointer' : 'default' }}
                >
                  <div
                    className="cd-progress-fill"
                    style={{ width: `${progressPct}%`, transition: 'width 0.25s linear' }}
                  />
                  {hasDisc && (
                    <div className="cd-progress-thumb" style={{ left: `${progressPct}%` }} />
                  )}
                </div>
                <span className="cd-progress-time mono">
                  {fmt(audioProgress)} / {fmt(audioDuration)}
                </span>
              </div>

              <div className="cd-lcd-row cd-lcd-bot mono">
                <span>TRK {hasDisc ? String(playingIdx + 1).padStart(2, '0') : '--'} / {String(count).padStart(2, '0')}</span>
                <span>{loop ? '↺ LOOP' : shuffle ? '⇄ SHUF' : '◉ STEREO'}</span>
              </div>

              <div className="cd-lcd-format mono">44.1 kHz · CD AUDIO</div>
            </div>
          </div>
        </div>

        {/* EQ — driven by analyserNode when available, else CSS fallback */}
        <div
          ref={eqRef}
          className={`cd-dev-eq${!analyserNode && !eqActive ? ' cd-dev-eq--idle' : ''}`}
        >
          {[...Array(52)].map((_, i) => (
            <div
              key={i}
              className={`cd-dev-eq-bar${analyserNode ? ' cd-dev-eq-bar--live' : ''}`}
              style={{ '--i': i }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="cd-dev-controls">
          <motion.button
            className={`cd-btn cd-btn--mode mono${shuffle ? ' cd-btn--mode-on' : ''}`}
            onClick={() => setShuffle(s => !s)}
            whileTap={{ scale: 0.88 }}
            title="Shuffle"
          >SHF</motion.button>

          <motion.button
            className="cd-btn cd-btn--skip mono"
            onClick={skipPrev}
            whileTap={{ scale: 0.88 }}
            aria-label="previous"
          >◄◄</motion.button>

          <motion.button
            className="cd-btn cd-btn--play"
            onClick={handlePlayButton}
            whileTap={{ scale: 0.88 }}
            aria-label={isAudioPlaying ? 'pause' : 'play'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isAudioPlaying ? (
                <motion.svg key="pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}
                >
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </motion.svg>
              ) : (
                <motion.svg key="play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}
                >
                  <path d="M8 5v14l11-7z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>

          <motion.button
            className="cd-btn cd-btn--skip mono"
            onClick={skipNext}
            whileTap={{ scale: 0.88 }}
            aria-label="next"
          >►►</motion.button>

          <motion.button
            className={`cd-btn cd-btn--mode mono${loop ? ' cd-btn--mode-on' : ''}`}
            onClick={() => setLoop(l => !l)}
            whileTap={{ scale: 0.88 }}
            title="Loop"
          >LOOP</motion.button>

          <motion.button
            className="cd-btn cd-btn--eject"
            onClick={handleEject}
            whileTap={{ scale: 0.88, rotate: -3 }}
            aria-label="eject"
            title="Eject"
            disabled={!hasDisc && !ejecting}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 20h14v-2H5v2zm7-18L5 13h14L12 2z"/>
            </svg>
          </motion.button>
        </div>

      </div>
    </div>
  )
}
