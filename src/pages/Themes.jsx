import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CottageCoreMeta, drawCottageCore } from '../components/reader/themes/CottageCore'
import { MidnightForestMeta, drawMidnightForest } from '../components/reader/themes/MidnightForest'
import { SakuraBloomMeta, drawSakuraBloom } from '../components/reader/themes/SakuraBloom'
import { WisteriaKiramanMeta, drawWisteriaKiraman } from '../components/reader/themes/WisteriaKiraman'
import { ScholarInkMeta, drawScholarInk } from '../components/reader/themes/ScholarInk'
import { CyberpunkMeta, drawCyberpunk } from '../components/reader/themes/Cyberpunk'
import './Themes.css'

const ALL_THEMES = [
  { meta: CottageCoreMeta, draw: drawCottageCore },
  { meta: MidnightForestMeta, draw: drawMidnightForest },
  { meta: SakuraBloomMeta, draw: drawSakuraBloom },
  { meta: WisteriaKiramanMeta, draw: drawWisteriaKiraman },
  { meta: ScholarInkMeta, draw: drawScholarInk },
  { meta: CyberpunkMeta, draw: drawCyberpunk },
]

function ThemePreview({ theme }) {
  const canvasRef = useRef(null)
  const tickRef = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const loop = () => {
      tickRef.current++
      theme.draw(ctx, canvas.offsetWidth, canvas.offsetHeight, tickRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [theme])

  return (
    <motion.div
      className="theme-card"
      style={{ background: theme.meta.bg }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <canvas ref={canvasRef} className="theme-canvas" />
      <div className="theme-card-overlay" style={{ '--tc-accent': theme.meta.accent }}>
        <div className="theme-card-dots">
          <div style={{ background: theme.meta.accent }} />
          <div style={{ background: theme.meta.text, opacity: 0.4 }} />
        </div>
        <div className="theme-card-info">
          <div className="theme-card-name display" style={{ color: theme.meta.text }}>
            {theme.meta.name}
          </div>
          <div className="theme-card-palette">
            {[theme.meta.bg, theme.meta.text, theme.meta.accent, theme.meta.surface].map((c, i) => (
              <div key={i} className="theme-swatch" style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Themes() {
  return (
    <div className="themes-page page">
      <motion.div
        className="themes-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="themes-eyebrow mono">Reader Themes</div>
        <h1 className="themes-title display">6 Worlds to Read In</h1>
        <p className="themes-sub serif">each theme transforms the reading experience with a live animated canvas</p>
      </motion.div>

      <div className="themes-grid">
        {ALL_THEMES.map((theme, i) => (
          <motion.div
            key={theme.meta.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
          >
            <ThemePreview theme={theme} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
