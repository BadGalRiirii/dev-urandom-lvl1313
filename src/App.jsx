import { useState, useRef, useCallback, useEffect, useLayoutEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import Nav from './components/layout/Nav'
import BootSequence from './components/layout/BootSequence'
import ErrorBoundary from './components/layout/ErrorBoundary'
import MusicPlayerBar from './components/layout/MusicPlayerBar'
import { wakeBackend } from './lib/api'

import './styles/global.css'

// Each page is its own chunk — three.js, tiptap, epubjs and react-pdf only
// download when the page that needs them is opened.
const PAGES = {
  home:    () => import('./pages/Home'),
  library: () => import('./pages/Library'),
  read:    () => import('./pages/Read'),
  journal: () => import('./pages/Journal'),
  post:    () => import('./pages/Post'),
  music:   () => import('./pages/Music'),
  admin:   () => import('./pages/Admin'),
  themes:  () => import('./pages/Themes'),
  orchard: () => import('./pages/Orchard'),
}
const Home    = lazy(PAGES.home)
const Library = lazy(PAGES.library)
const Read    = lazy(PAGES.read)
const Journal = lazy(PAGES.journal)
const Post    = lazy(PAGES.post)
const Music   = lazy(PAGES.music)
const Admin   = lazy(PAGES.admin)
const Themes  = lazy(PAGES.themes)
const Orchard = lazy(PAGES.orchard)

// Which page chunk the current URL needs, so it can download during the intro
const pageForPath = (path) => PAGES[path.split('/')[1]] ?? PAGES.home

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

const TITLES = {
  '/':        'riri/dev/urandom',
  '/library': 'riri/dev/urandom — Library',
  '/journal': 'riri/dev/urandom — The Journal',
  '/music':   'riri/dev/urandom — The Music',
  '/admin':   'riri/dev/urandom — Admin',
  '/themes':  'riri/dev/urandom — Themes',
  '/orchard': 'riri/dev/urandom — The Orchard',
}

function AppInner() {
  const location = useLocation()
  const isRead   = location.pathname.startsWith('/read')
  const isAdmin  = location.pathname.startsWith('/admin')
  const isHome   = location.pathname === '/'
  const isGame   = location.pathname === '/orchard'   // full screen, no bars
  const showNav  = !isRead && !isAdmin && !isHome && !isGame

  useLayoutEffect(() => {
    const base = 'riri/dev/urandom'
    const custom = TITLES[location.pathname]
    document.title = custom ?? base
  }, [location.pathname])

  const [currentTrack,   setCurrentTrack]   = useState(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [audioProgress,  setAudioProgress]  = useState(0)
  const [audioDuration,  setAudioDuration]  = useState(0)
  const [analyserNode,   setAnalyserNode]   = useState(null)

  const playerRef     = useRef(null)
  const trackEndedRef = useRef(null)

  // Keep live refs so the spacebar handler never captures stale state
  const isPlayingRef    = useRef(isAudioPlaying)
  const currentTrackRef = useRef(currentTrack)
  useEffect(() => { isPlayingRef.current    = isAudioPlaying }, [isAudioPlaying])
  useEffect(() => { currentTrackRef.current = currentTrack   }, [currentTrack])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space') return
      if (!currentTrackRef.current) return
      // Only skip spacebar in actual text-entry elements.
      // Buttons/selects must NOT be excluded — without this, spacebar on a focused
      // skip/eject button fires that button's click instead of play/pause.
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (document.activeElement?.isContentEditable) return
      e.preventDefault()
      if (isPlayingRef.current) {
        playerRef.current?.pause()
      } else {
        playerRef.current?.resume()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

      {/* Keyed by path so moving to another page clears a crash screen */}
      <ErrorBoundary key={location.pathname}>
      <Suspense fallback={null}>
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
        <Route path="/orchard" element={<Orchard />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>

      {!isRead && !isGame && (
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

  // While the intro types out: wake the Render backend (it sleeps when idle
  // and takes ~30-50s to cold start) and download the page about to be shown
  // (for Home this also starts fetching the 3D model).
  useEffect(() => {
    wakeBackend()
    pageForPath(window.location.pathname)().catch(() => {})
  }, [])

  const handleBootComplete = useCallback(() => {
    sessionStorage.setItem(HIDE_BOOT_KEY, '1')
    setBooted(true)
  }, [])

  return (
    <BrowserRouter>
      <AnimatePresence>
        {!booted && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>
      {booted && <AppInner />}
    </BrowserRouter>
  )
}
