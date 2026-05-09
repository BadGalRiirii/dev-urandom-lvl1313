import { useState } from 'react'
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
  const isRead = location.pathname.startsWith('/read')
  const isAdmin = location.pathname.startsWith('/admin')
  const showNav = !isRead && !isAdmin

  const [currentTrack, setCurrentTrack] = useState(null)

  return (
    <>
      <div className="vignette" />
      <div className="light-leak light-leak-1" />
      <div className="light-leak light-leak-2" />
      <div className="light-leak light-leak-3" />

      {showNav && <Nav />}

      <Routes>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/library" element={<PageWrapper><Library /></PageWrapper>} />
        <Route path="/read/:id" element={<Read />} />
        <Route path="/journal" element={<PageWrapper><Journal /></PageWrapper>} />
        <Route path="/post/:id" element={<PageWrapper><Post /></PageWrapper>} />
        <Route path="/music" element={<PageWrapper><Music onPlay={setCurrentTrack} /></PageWrapper>} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/themes" element={<PageWrapper><Themes /></PageWrapper>} />
      </Routes>

      {!isRead && (
        <MusicPlayerBar track={currentTrack} onClose={() => setCurrentTrack(null)} />
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
