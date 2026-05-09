import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import './ReaderToolbar.css'

const THEMES = [
  { id: 'cottage', label: 'Cottage' },
  { id: 'midnight', label: 'Forest' },
  { id: 'sakura', label: 'Sakura' },
  { id: 'wisteria', label: 'Wisteria' },
  { id: 'scholar', label: 'Scholar' },
  { id: 'cyberpunk', label: 'Cyber' },
]

export default function ReaderToolbar({ theme, setTheme, fontSize, setFontSize, progress }) {
  return (
    <motion.div
      className="reader-toolbar"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="toolbar-left">
        <Link to="/library" className="toolbar-back mono" title="Back to library">←</Link>
        <div className="toolbar-themes">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-dot ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
              title={t.label}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-center">
        <div className="toolbar-progress-bar">
          <div className="toolbar-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="toolbar-progress-label mono">{Math.round(progress * 100)}%</span>
      </div>

      <div className="toolbar-right">
        <button className="toolbar-font-btn" onClick={() => setFontSize((s) => Math.max(12, s - 2))}>A−</button>
        <span className="toolbar-font-size mono">{fontSize}px</span>
        <button className="toolbar-font-btn" onClick={() => setFontSize((s) => Math.min(28, s + 2))}>A+</button>
      </div>
    </motion.div>
  )
}
