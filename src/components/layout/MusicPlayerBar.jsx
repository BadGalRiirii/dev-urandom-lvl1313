import { forwardRef, useRef, useEffect, useImperativeHandle, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import cdFallback from '../../assets/cd.png'
import './MusicPlayerBar.css'

const MusicPlayerBar = forwardRef(function MusicPlayerBar(
  { track, onClose, onPlayStateChange, onEnded, onProgressChange, onAnalyserReady },
  ref
) {
  const audioRef     = useRef(null)
  const audioCtxRef  = useRef(null)
  const analyserRef  = useRef(null)

  const [playing,  setPlaying]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const onEndedRef          = useRef(onEnded)
  const onProgressChangeRef = useRef(onProgressChange)
  const onAnalyserReadyRef  = useRef(onAnalyserReady)
  useEffect(() => { onEndedRef.current          = onEnded },          [onEnded])
  useEffect(() => { onProgressChangeRef.current = onProgressChange }, [onProgressChange])
  useEffect(() => { onAnalyserReadyRef.current  = onAnalyserReady },  [onAnalyserReady])

  const ensureAnalyser = useCallback(() => {
    try {
      if (analyserRef.current) {
        audioCtxRef.current?.resume()
        return
      }
      const ctx      = new (window.AudioContext || window.webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize              = 256
      analyser.smoothingTimeConstant = 0.85
      const source = ctx.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      onAnalyserReadyRef.current?.(analyser)
    } catch (e) {
      // AudioContext unavailable — EQ falls back to CSS animation
    }
  }, [])

  useImperativeHandle(ref, () => ({
    pause()  { audioRef.current?.pause(); setPlaying(false) },
    resume() {
      audioCtxRef.current?.resume()
      audioRef.current?.play().catch(() => {})
      setPlaying(true)
    },
    stop()   {
      const a = audioRef.current
      if (a) { a.pause(); a.currentTime = 0 }
      setPlaying(false)
    },
    seek(pct) {
      const a = audioRef.current
      if (a && a.duration) a.currentTime = pct * a.duration
    },
  }))

  useEffect(() => { onPlayStateChange?.(playing) }, [playing])

  useEffect(() => {
    if (!track) return
    setPlaying(false)
    setProgress(0)
    const audio = audioRef.current
    if (!audio) return
    audio.src = track.url
    audio.play()
      .then(() => { setPlaying(true); ensureAnalyser() })
      .catch(() => {})
  }, [track, ensureAnalyser])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () => {
      setProgress(audio.currentTime)
      onProgressChangeRef.current?.(audio.currentTime, audio.duration || 0)
    }
    const onDur = () => setDuration(audio.duration)
    const onEnd = () => { setPlaying(false); onEndedRef.current?.() }
    audio.addEventListener('timeupdate',     update)
    audio.addEventListener('loadedmetadata', onDur)
    audio.addEventListener('ended',          onEnd)
    return () => {
      audio.removeEventListener('timeupdate',     update)
      audio.removeEventListener('loadedmetadata', onDur)
      audio.removeEventListener('ended',          onEnd)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      ensureAnalyser()
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }

  const seek = (e) => {
    const rect  = e.currentTarget.getBoundingClientRect()
    const pct   = (e.clientX - rect.left) / rect.width
    const audio = audioRef.current
    if (audio && duration) audio.currentTime = pct * duration
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} crossOrigin="anonymous" />
      <AnimatePresence>
        {track && (
          <motion.div
            className="player-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="player-drive-bay">
              <div className="player-ribs" />
              <div className="player-cd-tray">
                <div className="player-cd-slot-line" />
                <div className="player-cd-clip">
                  <img
                    src={track.coverImage ?? cdFallback}
                    alt="CD"
                    className={`player-cd${playing ? ' spinning' : ''}`}
                  />
                </div>
                <div className="player-cd-hole" />
              </div>
              <div className="player-ribs player-ribs--right" />
            </div>

            <div className="player-info">
              <div className="player-title">{track.title}</div>
              {track.artist && <div className="player-artist mono">{track.artist}</div>}
            </div>

            <div className="player-progress-wrap">
              <span className="player-time mono">{fmt(progress)}</span>
              <div className="player-progress" onClick={seek}>
                <div className="player-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="player-time mono">{fmt(duration)}</span>
            </div>

            <div className="player-controls">
              <button className="player-btn" onClick={toggle} aria-label="play/pause">
                {playing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>

            <button className="player-close" onClick={onClose} aria-label="close">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})

export default MusicPlayerBar
