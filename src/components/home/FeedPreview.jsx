import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import TypeBadge from '../ui/TypeBadge'
import { getBooks, getPosts, getTracks } from '../../lib/api'
import './FeedPreview.css'

function SkeletonCard({ delay }) {
  return (
    <motion.div
      className="feed-card-skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="skeleton skel-badge" />
      <div className="skeleton skel-title" />
      <div className="skeleton skel-sub" />
    </motion.div>
  )
}

function FeedCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={item.to || '#'} className="feed-card">
        <div className="feed-card-top">
          <TypeBadge type={item.type} />
          <span className="feed-card-meta mono">{item.meta || 'New'}</span>
        </div>
        <div className="feed-card-title">{item.title}</div>
        {item.sub && <div className="feed-card-sub mono">{item.sub}</div>}
        <div className="feed-card-arrow">→</div>
      </Link>
    </motion.div>
  )
}

export default function FeedPreview() {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getBooks(), getPosts(), getTracks()])
      .then(([books, posts, tracks]) => {
        const merged = []
        if (posts.status === 'fulfilled' && posts.value?.length) {
          merged.push(...posts.value.slice(0, 2).map(p => ({
            id: p.id, type: p.category || 'post', title: p.title,
            sub: p.related_title, to: `/post/${p.id}`, meta: 'Latest',
          })))
        }
        if (books.status === 'fulfilled' && books.value?.length) {
          merged.push(...books.value.slice(0, 2).map(b => ({
            id: b.id, type: b.file_type || 'pdf', title: b.title,
            sub: b.author, to: `/read/${b.id}`, meta: b.file_type?.toUpperCase(),
          })))
        }
        if (tracks.status === 'fulfilled' && tracks.value?.length) {
          merged.push(...tracks.value.slice(0, 1).map(t => ({
            id: t.id, type: 'music', title: t.title,
            sub: t.artist, to: '/music', meta: 'Track',
          })))
        }
        setItems(merged.length ? merged.slice(0, 5) : [])
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="feed-preview">
      <div className="feed-corner-br" aria-hidden="true" />
      <div className="feed-header">
        <span className="feed-label">Recent Additions</span>
        <div className="feed-header-line" />
      </div>

      <div className="feed-list">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeletons" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {[0, 1, 2].map(i => <SkeletonCard key={i} delay={i * 0.07} />)}
            </motion.div>
          ) : items?.length === 0 ? (
            <motion.p
              key="empty"
              className="feed-empty mono"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              — archive is empty —
            </motion.p>
          ) : (
            <motion.div key="items">
              {items.map((item, i) => <FeedCard key={item.id} item={item} index={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
