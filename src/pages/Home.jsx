import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ParallaxScene from '../components/home/ParallaxScene'
import HeroText from '../components/home/HeroText'
import FeedPreview from '../components/home/FeedPreview'
import Ticker from '../components/home/Ticker'
import './Home.css'

export default function Home() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const pageRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (!pageRef.current) return
    const rect = pageRef.current.getBoundingClientRect()
    setMouse({
      x: e.clientX - rect.width / 2,
      y: e.clientY - rect.height / 2,
    })
  }, [])

  return (
    <div className="home-page" ref={pageRef} onMouseMove={handleMouseMove}>
      {/* Full-viewport scene */}
      <div className="home-scene">
        <ParallaxScene mouse={mouse} />
        {/* Gradient floor */}
        <div className="home-gradient-floor" />
      </div>

      {/* Main content */}
      <motion.div
        className="home-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <div className="home-main">
          <HeroText />
          <FeedPreview />
        </div>
      </motion.div>

      {/* Ticker bar */}
      <div className="home-ticker">
        <Ticker />
      </div>
    </div>
  )
}
