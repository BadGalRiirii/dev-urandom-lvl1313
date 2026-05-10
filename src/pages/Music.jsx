import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import RecordCarousel from '../components/music/RecordCarousel'
import { getTracks } from '../lib/api'
import './Music.css'

export default function Music({
  onPlay, onPause, onResume, onEject, isAudioPlaying,
  audioProgress, audioDuration, onRegisterEnded, onSeek, analyserNode,
}) {
  const [tracks,  setTracks]  = useState([])
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
          <div className="music-eyebrow mono">/dev/music</div>
          <h1 className="music-title display">THE MUSIC</h1>
          <p className="music-sub">sounds loaded into memory</p>
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
        <RecordCarousel
          tracks={tracks}
          onPlay={onPlay}
          onPause={onPause}
          onResume={onResume}
          onEject={onEject}
          isAudioPlaying={isAudioPlaying}
          audioProgress={audioProgress}
          audioDuration={audioDuration}
          onRegisterEnded={onRegisterEnded}
          onSeek={onSeek}
          analyserNode={analyserNode}
        />
      )}
    </div>
  )
}
