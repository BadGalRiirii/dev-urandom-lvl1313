import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './MusicPlayerBar.css'

export default function MusicPlayerBar({ track, onClose }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!track) return
    setPlaying(false)
    setProgress(0)
    const audio = audioRef.current
    if (audio) {
      audio.src = track.url
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }, [track])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () => setProgress(audio.currentTime)
    const setDur = () => setDuration(audio.duration)
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('loadedmetadata', setDur)
    return () => {
      audio.removeEventListener('timeupdate', update)
      audio.removeEventListener('loadedmetadata', setDur)
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const audio = audioRef.current
    if (audio && duration) {
      audio.currentTime = pct * duration
    }
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <>
      <audio ref={audioRef} />
      <AnimatePresence>
        {track && (
          <motion.div
            className="player-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="player-info">
              <div
                className="player-disc"
                style={{ background: track.cover_color || '#e6b400' }}
              >
                <div className="player-disc-hole" />
              </div>
              <div>
                <div className="player-title">{track.title}</div>
                <div className="player-artist mono">{track.artist}</div>
              </div>
            </div>

            <div className="player-controls">
              <button className="player-btn" onClick={toggle} aria-label="play/pause">
                {playing ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="player-progress-wrap">
              <span className="player-time mono">{fmt(progress)}</span>
              <div className="player-progress" onClick={seek}>
                <div className="player-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="player-time mono">{fmt(duration)}</span>
            </div>

            <button className="player-close" onClick={onClose} aria-label="close">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
