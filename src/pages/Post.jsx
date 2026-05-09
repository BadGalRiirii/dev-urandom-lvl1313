import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import TypeBadge from '../components/ui/TypeBadge'
import { getPost } from '../lib/api'
import './Post.css'

const STARS = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0))

export default function Post() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPost(id)
      .then((data) => setPost(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="post-page page">
      <div className="skeleton" style={{ height: 48, width: '60%', marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 40 }} />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 18, marginBottom: 12 }} />
      ))}
    </div>
  )

  if (!post) return (
    <div className="post-page page">
      <div className="post-not-found mono">Post not found.</div>
      <Link to="/journal" className="btn btn-yellow" style={{ marginTop: 24 }}>← Journal</Link>
    </div>
  )

  return (
    <div className="post-page page">
      <motion.article
        className="post-article"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link to="/journal" className="post-back mono">← Journal</Link>

        <header className="post-header">
          <div className="post-meta">
            <TypeBadge type={post.category || 'post'} />
            {post.rating && <span className="post-stars">{STARS(post.rating)}</span>}
            <time className="post-date mono">
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </time>
          </div>
          <h1 className="post-title display">{post.title}</h1>
          {post.related_title && (
            <p className="post-related mono">re: {post.related_title}</p>
          )}
        </header>

        <div
          className="post-body"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </motion.article>
    </div>
  )
}
