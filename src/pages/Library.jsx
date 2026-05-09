import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import BookCarousel from '../components/library/BookCarousel'
import TypeBadge from '../components/ui/TypeBadge'
import { getBooks } from '../lib/api'
import './Library.css'

const PLACEHOLDER = [
  { id: 'ph1', title: 'Loading...', author: '', file_type: 'pdf', cover_color: '#333' },
]

export default function Library() {
  const [books, setBooks] = useState(PLACEHOLDER)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getBooks()
      .then((data) => { if (data?.length) setBooks(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? books : books.filter((b) => b.file_type === filter)

  return (
    <div className="library-page page">
      <div className="library-header">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="library-eyebrow mono">Chapter 02</div>
          <h1 className="library-title display">The Library</h1>
          <p className="library-sub serif">every spine tells a story</p>
        </motion.div>

        <div className="library-filters">
          {['all', 'pdf', 'epub'].map((f) => (
            <button
              key={f}
              className={`pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="library-loading">
          <div className="skeleton" style={{ height: 240, width: '60%', margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="library-empty mono">
          No books in the archive yet — upload some via /admin
        </div>
      ) : (
        <BookCarousel books={filtered} />
      )}
    </div>
  )
}
