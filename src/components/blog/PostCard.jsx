import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import TypeBadge from '../ui/TypeBadge'
import './PostCard.css'

const RATING_STARS = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0))

export default function PostCard({ post, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/post/${post.id}`} className="post-card">
        {post.cover_image && (
          <div className="post-card-image">
            <img src={post.cover_image} alt="" />
          </div>
        )}
        <div className="post-card-top">
          <TypeBadge type={post.category || 'post'} />
          {post.rating && (
            <span className="post-rating mono">{RATING_STARS(post.rating)}</span>
          )}
        </div>
        <h2 className="post-card-title display">{post.title}</h2>
        {post.related_title && (
          <div className="post-card-related mono">re: {post.related_title}</div>
        )}
        <div className="post-card-excerpt">
          {post.content
            ? post.content.replace(/<[^>]+>/g, '').slice(0, 120) + '…'
            : ''}
        </div>
        <div className="post-card-footer">
          <span className="post-card-date mono">
            {new Date(post.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
          <span className="post-card-read mono">Read →</span>
        </div>
      </Link>
    </motion.div>
  )
}
