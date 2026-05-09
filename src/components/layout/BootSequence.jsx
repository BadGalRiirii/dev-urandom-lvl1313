import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './BootSequence.css'

const LINES = [
  '> initializing /dev/urandom...',
  '> loading consciousness...',
  '> mounting /lvl1313',
  '> $ cd /dev/urandom/lvl1313',
]

export default function BootSequence({ onComplete }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (lineIndex >= LINES.length) {
      setTimeout(() => {
        setExiting(true)
        setTimeout(onComplete, 800)
      }, 600)
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
        setTimeout(() => setLineIndex((prev) => prev + 1), 300)
      }
    }, 35)

    return () => clearInterval(interval)
  }, [lineIndex, onComplete])

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="boot-overlay"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="boot-terminal">
            <div className="boot-header">
              <span className="boot-dot red" />
              <span className="boot-dot yellow" />
              <span className="boot-dot green" />
              <span className="boot-title mono">riri@urandom:~</span>
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
