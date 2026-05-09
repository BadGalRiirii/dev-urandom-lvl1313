import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import BookSpine from './BookSpine'
import './BookCarousel.css'

export default function BookCarousel({ books }) {
  const [center, setCenter] = useState(0)
  const navigate = useNavigate()
  const count = books.length

  const getOffset = (i) => {
    let d = i - center
    if (d > count / 2) d -= count
    if (d < -count / 2) d += count
    return d
  }

  const visible = books.map((_, i) => {
    const d = Math.abs(getOffset(i))
    return d <= 4
  })

  const getStyle = (i) => {
    const d = getOffset(i)
    const absD = Math.abs(d)
    const xPer = d * 50
    const scale = absD === 0 ? 1 : Math.max(0.65, 1 - absD * 0.1)
    const rotY = d * -12
    const z = -absD * 40
    const opacity = absD > 3 ? 0 : Math.max(0.3, 1 - absD * 0.25)
    return { xPer, scale, rotY, z, opacity }
  }

  return (
    <div className="book-carousel">
      <div className="carousel-stage">
        {books.map((book, i) => {
          if (!visible[i]) return null
          const { xPer, scale, rotY, z, opacity } = getStyle(i)
          const isCenter = i === center
          return (
            <motion.div
              key={book.id}
              className="carousel-item"
              style={{ zIndex: 10 - Math.abs(getOffset(i)) }}
              animate={{
                x: `${xPer}px`,
                scale,
                rotateY: rotY,
                z,
                opacity,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 28 }}
              onClick={() => {
                if (isCenter) navigate(`/read/${book.id}`)
                else setCenter(i)
              }}
            >
              <BookSpine
                book={book}
                index={i}
                isCenter={isCenter}
                onClick={() => {
                  if (isCenter) navigate(`/read/${book.id}`)
                  else setCenter(i)
                }}
              />
            </motion.div>
          )
        })}
      </div>

      {/* Shelf shadow */}
      <div className="carousel-shelf" />

      {/* Nav arrows */}
      <button
        className="carousel-arrow left"
        onClick={() => setCenter((c) => (c - 1 + count) % count)}
        aria-label="Previous"
      >‹</button>
      <button
        className="carousel-arrow right"
        onClick={() => setCenter((c) => (c + 1) % count)}
        aria-label="Next"
      >›</button>

      {/* Selected book info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={center}
          className="carousel-info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="carousel-info-title">{books[center]?.title}</div>
          {books[center]?.author && (
            <div className="carousel-info-author mono">{books[center].author}</div>
          )}
          <div className="carousel-info-hint mono">click to open</div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
