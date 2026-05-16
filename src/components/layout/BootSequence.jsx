import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './BootSequence.css'

const LINES = [
  { text: '> MOUNTING /dev/urandom...',       type: 'term' },
  { text: '> LOADING THE ARCHIVE...',          type: 'term' },
  { text: '> INITIALIZING MEMORY BANKS...',    type: 'term' },
  { text: '> DECRYPTING PERSONAL LOGS...',     type: 'term' },
  { text: '> WELCOME, RIRI.',                  type: 'term' },
  { text: '',                                  type: 'blank' },
  { text: 'carpe diem.',                       type: 'poetic' },
  { text: 'amor fati.',                        type: 'poetic' },
  { text: 'memento mori.',                     type: 'poetic' },
  { text: 'dame un grr omke.',                 type: 'poetic' },
  { text: 'chongke tayo magdamag.',            type: 'poetic' },
]

const CHAR_DELAY = { term: 32, poetic: 52 }
const LINE_PAUSE  = { term: 420, blank: 320, poetic: 750 }

export default function BootSequence({ onComplete }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [exiting,   setExiting]   = useState(false)

  useEffect(() => {
    if (lineIndex >= LINES.length) {
      const t = setTimeout(() => {
        setExiting(true)
        setTimeout(onComplete, 420)
      }, 1100)
      return () => clearTimeout(t)
    }

    const line = LINES[lineIndex]

    if (line.type === 'blank') {
      const t = setTimeout(() => setLineIndex(i => i + 1), LINE_PAUSE.blank)
      return () => clearTimeout(t)
    }

    const charDelay = CHAR_DELAY[line.type] ?? 32
    const linePause = LINE_PAUSE[line.type] ?? 420

    let i = 0
    setDisplayed('')
    const interval = setInterval(() => {
      i++
      setDisplayed(line.text.slice(0, i))
      if (i >= line.text.length) {
        clearInterval(interval)
        setTimeout(() => setLineIndex(prev => prev + 1), linePause)
      }
    }, charDelay)

    return () => clearInterval(interval)
  }, [lineIndex, onComplete])

  const currentLine = LINES[lineIndex]

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="boot-overlay"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42 }}
        >
          <div className="boot-terminal">
            <div className="boot-header">
              <span className="boot-dot coral" />
              <span className="boot-dot gold"  />
              <span className="boot-dot teal"  />
              <span className="boot-title mono">riri/dev/urandom — v1.03</span>
            </div>
            <div className="boot-body">
              {LINES.slice(0, lineIndex).map((line, i) => {
                if (line.type === 'blank') return <div key={i} className="boot-line-gap" />
                return (
                  <div
                    key={i}
                    className={`boot-line done boot-line--${line.type}${line.type === 'term' ? ' mono' : ''}`}
                  >
                    {line.text}
                  </div>
                )
              })}

              {lineIndex < LINES.length && currentLine.type !== 'blank' && (
                <div
                  className={`boot-line active boot-line--${currentLine.type}${currentLine.type === 'term' ? ' mono' : ''}`}
                >
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
