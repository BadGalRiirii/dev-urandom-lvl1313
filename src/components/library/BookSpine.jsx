import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import './BookSpine.css'

const SPINE_COLORS = [
  '#c81e1e','#e6b400','#1a4a7a','#2d6a2d',
  '#7a1a7a','#8b4500','#1a5a5a','#4a1a00',
]

export default function BookSpine({ book, index, isCenter, onClick }) {
  const color = book.cover_color || SPINE_COLORS[index % SPINE_COLORS.length]

  return (
    <motion.div
      className={`book-spine ${isCenter ? 'center' : ''}`}
      style={{ '--spine-color': color }}
      whileHover={{ y: -12, rotateY: isCenter ? 0 : 4 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      title={`${book.title}${book.author ? ` — ${book.author}` : ''}`}
    >
      <div className="spine-body">
        <div className="spine-inner">
          <div className="spine-top-stripe" />
          <div className="spine-text-wrap">
            <span className="spine-title">{book.title}</span>
            {book.author && <span className="spine-author mono">{book.author}</span>}
          </div>
          <div className="spine-type mono">{book.file_type?.toUpperCase() || 'PDF'}</div>
        </div>
        {isCenter && (
          <div className="spine-cover-hint">
            <div className="spine-cover-line" />
            <span className="spine-open mono">Open →</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
