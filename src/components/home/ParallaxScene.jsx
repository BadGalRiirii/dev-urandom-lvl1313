import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import './ParallaxScene.css'

const BOOKS = [
  { color: '#c81e1e', width: 28, height: 140, x: '8%', y: '35%', rot: -3 },
  { color: '#e6b400', width: 22, height: 160, x: '10%', y: '35%', rot: 1 },
  { color: '#1a4a7a', width: 32, height: 130, x: '12.5%', y: '35%', rot: -1.5 },
  { color: '#2d6a2d', width: 18, height: 150, x: '14.5%', y: '35%', rot: 2 },
  { color: '#7a1a7a', width: 26, height: 145, x: '16%', y: '35%', rot: -2 },
]

const RECORDS = [
  { color: '#111', label: '#e6b400', x: '75%', y: '25%' },
  { color: '#1a0a0a', label: '#c81e1e', x: '80%', y: '60%' },
]

function BookStack({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 60, damping: 20 })

  useEffect(() => {
    x.set(mouse.x * 0.008)
    y.set(mouse.y * 0.008)
  }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-books" style={{ x, y }}>
      {BOOKS.map((b, i) => (
        <div
          key={i}
          className="book-spine-parallax"
          style={{
            background: b.color,
            width: b.width,
            height: b.height,
            left: b.x,
            top: b.y,
            transform: `rotate(${b.rot}deg)`,
          }}
        >
          <div className="book-spine-line" />
        </div>
      ))}
    </motion.div>
  )
}

function VinylRecord({ record, mouse, depth }) {
  const x = useSpring(useMotionValue(0), { stiffness: 40, damping: 15 })
  const y = useSpring(useMotionValue(0), { stiffness: 40, damping: 15 })

  useEffect(() => {
    x.set(mouse.x * depth)
    y.set(mouse.y * depth)
  }, [mouse.x, mouse.y, x, y, depth])

  return (
    <motion.div
      className="parallax-record"
      style={{ x, y, left: record.x, top: record.y }}
    >
      <div className="record-disc" style={{ background: record.color }}>
        <div className="record-label" style={{ background: record.label }} />
        <div className="record-hole" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="record-groove" style={{ inset: 10 + i * 10 }} />
        ))}
      </div>
    </motion.div>
  )
}

function FilmStrip({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 30, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 30, damping: 20 })

  useEffect(() => {
    x.set(mouse.x * -0.012)
    y.set(mouse.y * -0.012)
  }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-filmstrip" style={{ x, y }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="film-frame">
          <div className="film-hole top" />
          <div className="film-hole bot" />
        </div>
      ))}
    </motion.div>
  )
}

export default function ParallaxScene({ mouse }) {
  return (
    <div className="parallax-scene">
      {/* WKW light leaks */}
      <motion.div
        className="leak leak-gold"
        animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.07, 0.04] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="leak leak-red"
        animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.05, 0.03] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="leak leak-violet"
        animate={{ scale: [1, 1.08, 1], opacity: [0.02, 0.04, 0.02] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      <BookStack mouse={mouse} />

      {RECORDS.map((r, i) => (
        <VinylRecord key={i} record={r} mouse={mouse} depth={0.015 + i * 0.005} />
      ))}

      <FilmStrip mouse={mouse} />
    </div>
  )
}
