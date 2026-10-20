import { useEffect, useState, Component, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import PostCard from '../components/blog/PostCard'
import { getPosts } from '../lib/api'
import wisImg from '../assets/wisteria.webp'
import './Journal.css'

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

// three.js is big — load it separately so the posts show up first
const WisteriaScene = lazy(() => import('../components/journal/WisteriaScene'))
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const CATEGORIES = ['all', 'book', 'film', 'series', 'personal']

export default function Journal() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    document.body.classList.add('page-journal')
    return () => document.body.classList.remove('page-journal')
  }, [])

  useEffect(() => {
    getPosts()
      .then((data) => { if (data?.length) setPosts(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.category === filter)

  return (
    <>
      {/* ── Fixed atmospheric background ── */}
      <div className="journal-bg" aria-hidden="true">
        <img src={wisImg} alt="" className="journal-bg-img" />
        <div className="journal-bg-overlay" />
      </div>

      {/* ── Falling wisteria petals ── */}
      {!reducedMotion && (
        <SceneBoundary>
          <Suspense fallback={null}><WisteriaScene /></Suspense>
        </SceneBoundary>
      )}

      {/* ── Page content ── */}
      <div className="journal-page page">
        <div className="journal-header">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="journal-eyebrow mono">Chapter 03</div>
            <div className="journal-rule" aria-hidden="true">
              <span className="jr-line" />
              <span className="jr-glyph">✦</span>
              <span className="jr-line jr-line--long" />
            </div>
            <h1 className="journal-title display">The Journal</h1>
            <p className="journal-sub serif">thoughts on things worth loving</p>
          </motion.div>

          <div className="journal-filters">
            {CATEGORIES.map((c) => (
              <button key={c} className={`pill ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="journal-skeleton">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="journal-empty mono">
            No entries yet — write something via /admin
          </div>
        ) : (
          <div className="journal-grid">
            {filtered.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
