import { useState, useRef, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import Nav from './components/layout/Nav'
import BootSequence from './components/layout/BootSequence'
import MusicPlayerBar from './components/layout/MusicPlayerBar'

import Home from './pages/Home'
import Library from './pages/Library'
import Read from './pages/Read'
import Journal from './pages/Journal'
import Post from './pages/Post'
import Music from './pages/Music'
import Admin from './pages/Admin'
import Themes from './pages/Themes'

import './styles/global.css'

const HIDE_BOOT_KEY = 'riri_boot_done'

function PageWrapper({ children }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function AppInner() {
  const location = useLocation()
  const isRead   = location.pathname.startsWith('/read')
  const isAdmin  = location.pathname.startsWith('/admin')
  const isHome   = location.pathname === '/'
  const showNav  = !isRead && !isAdmin && !isHome

  const [currentTrack,   setCurrentTrack]   = useState(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioProgress,  setAudioProgress]  = useState(0)
  const [audioDuration,  setAudioDuration]  = useState(0)
  const [analyserNode,   setAnalyserNode]   = useState(null)

  const playerRef     = useRef(null)
  const trackEndedRef = useRef(null)

  const handlePlay   = useCallback((track) => setCurrentTrack(track), [])
  const handlePause  = useCallback(() => playerRef.current?.pause(),  [])
  const handleResume = useCallback(() => playerRef.current?.resume(), [])
  const handleEject  = useCallback(() => {
    playerRef.current?.stop()
    setCurrentTrack(null)
    setIsAudioPlaying(false)
    setAudioProgress(0)
    setAudioDuration(0)
  }, [])

  const handleProgressChange = useCallback((p, d) => {
    setAudioProgress(p)
    setAudioDuration(d)
  }, [])

  const handleTrackEnded  = useCallback(() => { trackEndedRef.current?.() }, [])
  const registerEnded     = useCallback((fn) => { trackEndedRef.current = fn }, [])
  const handleSeek        = useCallback((pct) => { playerRef.current?.seek(pct) }, [])
  const handleAnalyserReady = useCallback((node) => { setAnalyserNode(node) }, [])

  return (
    <>
      <div className="vignette" />
      <div className="light-leak light-leak-1" />
      <div className="light-leak light-leak-2" />
      <div className="light-leak light-leak-3" />

      {showNav && <Nav />}

      <Routes>
        <Route path="/"        element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/library" element={<PageWrapper><Library /></PageWrapper>} />
        <Route path="/read/:id" element={<Read />} />
        <Route path="/journal"  element={<PageWrapper><Journal /></PageWrapper>} />
        <Route path="/post/:id" element={<PageWrapper><Post /></PageWrapper>} />
        <Route path="/music" element={
          <PageWrapper>
            <Music
              onPlay={handlePlay}
              onPause={handlePause}
              onResume={handleResume}
              onEject={handleEject}
              isAudioPlaying={isAudioPlaying}
              audioProgress={audioProgress}
              audioDuration={audioDuration}
              onRegisterEnded={registerEnded}
              onSeek={handleSeek}
              analyserNode={analyserNode}
            />
          </PageWrapper>
        } />
        <Route path="/admin"  element={<Admin />} />
        <Route path="/themes" element={<PageWrapper><Themes /></PageWrapper>} />
      </Routes>

      {!isRead && (
        <MusicPlayerBar
          ref={playerRef}
          track={currentTrack}
          onClose={handleEject}
          onPlayStateChange={setIsAudioPlaying}
          onEnded={handleTrackEnded}
          onProgressChange={handleProgressChange}
          onAnalyserReady={handleAnalyserReady}
        />
      )}
    </>
  )
}

export default function App() {
  const [booted, setBooted] = useState(() => !!sessionStorage.getItem(HIDE_BOOT_KEY))

  const handleBootComplete = () => {
    sessionStorage.setItem(HIDE_BOOT_KEY, '1')
    setBooted(true)
  }

  return (
    <BrowserRouter>
      <AnimatePresence>
        {!booted && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>
      {booted && <AppInner />}
    </BrowserRouter>
  )
}
