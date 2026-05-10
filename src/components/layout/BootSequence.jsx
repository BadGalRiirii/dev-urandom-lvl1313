import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './BootSequence.css'

const LINES = [
  '> MOUNTING /dev/urandom...',
  '> LOADING THE ARCHIVE...',
  '> WELCOME, RIRI.',
]

export default function BootSequence({ onComplete }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (lineIndex >= LINES.length) {
      setTimeout(() => {
        setExiting(true)
        setTimeout(onComplete, 380)
      }, 180)
      return
    }

    const line = LINES[lineIndex]
    let i = 0
    setDisplayed('')
    const interval = setInterval(() => {
      i++
      setDisplayed(line.slice(0, i))
      if (i >= line.length) {
        clearInterval(interval)
        setTimeout(() => setLineIndex((prev) => prev + 1), 70)
      }
    }, 13)

    return () => clearInterval(interval)
  }, [lineIndex, onComplete])

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="boot-overlay"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38 }}
        >
          <div className="boot-terminal">
            <div className="boot-header">
              <span className="boot-dot coral" />
              <span className="boot-dot gold" />
              <span className="boot-dot teal" />
              <span className="boot-title mono">riri/dev/urandom — v1.03</span>
            </div>
            <div className="boot-body">
              {LINES.slice(0, lineIndex).map((line, i) => (
                <div key={i} className="boot-line done mono">{line}</div>
              ))}
              {lineIndex < LINES.length && (
                <div className="boot-line active mono">
                  {displayed}
                  <span className="boot-cursor" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
