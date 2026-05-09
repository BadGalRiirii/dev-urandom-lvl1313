import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import TypeBadge from '../ui/TypeBadge'
import { getBooks, getPosts, getTracks } from '../../lib/api'
import './FeedPreview.css'

const PLACEHOLDER = [
  { id: 'p1', type: 'post', label: 'Journal', title: 'Notes on Wong Kar Wai\'s color grammar', to: '/journal' },
  { id: 'p2', type: 'epub', label: 'Epub', title: 'Loading from library...', to: '/library' },
  { id: 'p3', type: 'music', label: 'Music', title: 'Loading from collection...', to: '/music' },
]

function FeedCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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
  const [items, setItems] = useState(PLACEHOLDER)

  useEffect(() => {
    const load = async () => {
      try {
        const [books, posts, tracks] = await Promise.allSettled([
          getBooks(), getPosts(), getTracks(),
        ])
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
        if (merged.length) setItems(merged.slice(0, 5))
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="feed-preview">
      <div className="feed-header">
        <span className="feed-label mono">// latest drop</span>
      </div>
      <div className="feed-list">
        {items.map((item, i) => (
          <FeedCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  )
}
