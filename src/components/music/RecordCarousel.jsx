import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './RecordCarousel.css'

function Record({ track, index, isCenter, onSelect }) {
  const d = index
  const color = track.cover_color || '#1a1a1a'

  return (
    <motion.div
      className={`record-carousel-item ${isCenter ? 'center' : ''}`}
      whileHover={{ y: -16, scale: isCenter ? 1.05 : 1.02 }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
    >
      <div className="record-vinyl" style={{ '--rec-color': color }}>
        <div className="record-vinyl-inner">
          <div className="record-grooves">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="record-groove-ring" style={{ inset: 8 + i * 10 }} />
            ))}
          </div>
          <div className="record-label-disc">
            <div className="record-label-text">
              <div className="record-label-title">{track.title}</div>
              {track.artist && <div className="record-label-artist">{track.artist}</div>}
            </div>
            <div className="record-center-hole" />
          </div>
        </div>
        {isCenter && (
          <div className="record-play-hint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
      </div>
      <div className="record-shadow" />
    </motion.div>
  )
}

export default function RecordCarousel({ tracks, onPlay }) {
  const [center, setCenter] = useState(0)
  const count = tracks.length

  const getOffset = (i) => {
    let d = i - center
    if (d > count / 2) d -= count
    if (d < -count / 2) d += count
    return d
  }

  const handleClick = (i) => {
    if (i === center) onPlay?.(tracks[i])
    else setCenter(i)
  }

  return (
    <div className="record-carousel">
      <div className="record-stage">
        {tracks.map((track, i) => {
          const d = getOffset(i)
          const absD = Math.abs(d)
          if (absD > 3) return null
          const xPx = d * 140
          const scale = absD === 0 ? 1 : Math.max(0.6, 1 - absD * 0.15)
          const opacity = absD > 2 ? 0.3 : Math.max(0.4, 1 - absD * 0.3)
          const z = 10 - absD * 3

          return (
            <motion.div
              key={track.id}
              className="record-stage-item"
              style={{ zIndex: z }}
              animate={{ x: xPx, scale, opacity, rotateY: d * -10 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            >
              <Record
                track={track}
                index={i}
                isCenter={i === center}
                onSelect={() => handleClick(i)}
              />
            </motion.div>
          )
        })}
      </div>

      <button className="record-arrow left" onClick={() => setCenter((c) => (c - 1 + count) % count)}>‹</button>
      <button className="record-arrow right" onClick={() => setCenter((c) => (c + 1) % count)}>›</button>

      <AnimatePresence mode="wait">
        <motion.div
          key={center}
          className="record-info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="record-info-title display">{tracks[center]?.title}</div>
          {tracks[center]?.artist && (
            <div className="record-info-artist mono">{tracks[center].artist}</div>
          )}
          <button className="record-play-btn btn btn-yellow" onClick={() => onPlay?.(tracks[center])}>
            ▶ Play This
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
