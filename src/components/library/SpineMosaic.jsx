import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './SpineMosaic.css'

const canHover = () => window.matchMedia('(hover: hover)').matches

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

  const hoveredBook = hoveredIdx !== null ? books[hoveredIdx] : null
  const open = (book) => navigate(`/read/${book.id}`)

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
        {/* Full size on desktop; on a phone the spines shrink so the whole painting
            (every book) fits the screen. Sizes are in % so the painting still lines up. */}
        <div
          className="mosaic-grid"
          style={{
            gridTemplateColumns: `repeat(${maxPerRow}, 1fr)`,
            width: `min(100%, ${totalW + (maxPerRow - 1) * 2}px)`,
          }}
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
                role="link"
                tabIndex={0}
                aria-label={book.title}
                style={{
                  aspectRatio: `${SPINE_W} / ${SPINE_H}`,
                  backgroundImage: `url(${mosaicImage})`,
                  backgroundSize: `${maxPerRow * 100}% ${targetRows * 100}%`,
                  backgroundPosition: `${maxPerRow > 1 ? (col / (maxPerRow - 1)) * 100 : 0}% ${targetRows > 1 ? (row / (targetRows - 1)) * 100 : 0}%`,
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
                onMouseEnter={() => { if (canHover()) setHoveredIdx(i) }}
                // Mouse: hovering already shows the title, so a click opens the book.
                // Touch: the first tap shows the title, a second tap opens it.
                onClick={() => {
                  if (canHover() || hoveredIdx === i) open(book)
                  else setHoveredIdx(i)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') open(book) }}              />
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
              <button className="mosaic-reveal-title" onClick={() => open(hoveredBook)}>{hoveredBook.title}</button>
              {hoveredBook.author && (
                <span className="mosaic-reveal-author mono">{hoveredBook.author}</span>
              )}
              <span className="mosaic-reveal-hint mono">
                <span className="hint-mouse">click to open</span>
                <span className="hint-touch">tap again to open</span>
              </span>
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
              <span className="mosaic-reveal-idle mono">
                <span className="hint-mouse">— hover a spine —</span>
                <span className="hint-touch">— tap a spine —</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
