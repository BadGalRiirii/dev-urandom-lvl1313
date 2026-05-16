import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './SpineMosaic.css'

function getSpineDimensions(maxPerRow) {
  const w = Math.min(110, Math.max(64, Math.floor(800 / maxPerRow)))
  const h = Math.round(w * 4.8)
  return { w, h }
}

export default function SpineMosaic({ books, mosaicImage, title, type }) {
  const navigate = useNavigate()
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const count = books.length

  const targetRows = Math.max(1, Math.ceil(count / 20))
  const maxPerRow = Math.ceil(count / targetRows)
  const { w: SPINE_W, h: SPINE_H } = getSpineDimensions(maxPerRow)
  const totalW = maxPerRow * SPINE_W
  const totalH = targetRows * SPINE_H

  const hoveredBook = hoveredIdx !== null ? books[hoveredIdx] : null

  return (
    <section className="spine-mosaic-section">
      <div className="mosaic-meta">
        <span className="mosaic-meta-type mono">{type}</span>
        <span className="mosaic-meta-count mono">
          {count} {count === 1 ? 'volume' : 'volumes'}
        </span>
        <span className="mosaic-meta-divider">·</span>
        <span className="mosaic-meta-label serif">{title}</span>
      </div>

      <div className="mosaic-grid-scroll">
        <div
          className="mosaic-grid"
          style={{ gridTemplateColumns: `repeat(${maxPerRow}, ${SPINE_W}px)` }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {books.map((book, i) => {
            const col = i % maxPerRow
            const row = Math.floor(i / maxPerRow)
            const isHovered = hoveredIdx === i
            const isSibling = hoveredIdx !== null && !isHovered

            return (
              <motion.div
                key={book.id}
                className={`mosaic-spine${isHovered ? ' hovered' : ''}`}
                style={{
                  width: SPINE_W,
                  height: SPINE_H,
                  backgroundImage: `url(${mosaicImage})`,
                  backgroundSize: `${totalW}px ${totalH}px`,
                  backgroundPosition: `${-col * SPINE_W}px ${-row * SPINE_H}px`,
                  backgroundRepeat: 'no-repeat',
                }}
                animate={{
                  y: isHovered ? -20 : 0,
                  filter: isHovered
                    ? 'brightness(1.28) saturate(1.18) contrast(1.06)'
                    : isSibling
                    ? 'brightness(0.42) saturate(0.55)'
                    : 'brightness(0.82) saturate(0.88)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onTouchStart={() => setHoveredIdx(i)}
                onClick={() => {
                  if (hoveredIdx === i) navigate(`/read/${book.id}`)
                  else setHoveredIdx(i)
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Title reveal below the grid */}
      <div className="mosaic-title-reveal">
        <AnimatePresence mode="wait">
          {hoveredBook ? (
            <motion.div
              key={hoveredBook.id}
              className="mosaic-title-inner"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <span className="mosaic-reveal-title">{hoveredBook.title}</span>
              {hoveredBook.author && (
                <span className="mosaic-reveal-author mono">{hoveredBook.author}</span>
              )}
              <span className="mosaic-reveal-hint mono">click to open</span>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="mosaic-title-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span className="mosaic-reveal-idle mono">— hover a spine —</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
