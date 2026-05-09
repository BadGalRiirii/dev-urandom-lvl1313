import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import RecordCarousel from '../components/music/RecordCarousel'
import { getTracks } from '../lib/api'
import './Music.css'

export default function Music({ onPlay }) {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTracks()
      .then((data) => { if (data?.length) setTracks(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="music-page page">
      <div className="music-header">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="music-eyebrow mono">Chapter 04</div>
          <h1 className="music-title display">The Music</h1>
          <p className="music-sub serif">sounds that stay with you</p>
        </motion.div>
      </div>

      {loading ? (
        <div className="music-loading">
          <div className="record-placeholder">
            <div className="record-vinyl" style={{ width: 200, height: 200, background: '#1a1a1a', borderRadius: '50%' }}>
              <div className="skeleton" style={{ inset: 0, borderRadius: '50%', position: 'absolute' }} />
            </div>
          </div>
        </div>
      ) : tracks.length === 0 ? (
        <div className="music-empty mono">
          No tracks yet — upload some via /admin
        </div>
      ) : (
        <RecordCarousel tracks={tracks} onPlay={onPlay} />
      )}
    </div>
  )
}
