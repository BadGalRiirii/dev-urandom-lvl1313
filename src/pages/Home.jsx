import { motion } from 'framer-motion'
import ParallaxScene from '../components/home/ParallaxScene'
import ModelNav from '../components/home/ModelNav'
import HeroText from '../components/home/HeroText'
import FeedPreview from '../components/home/FeedPreview'
import Ticker from '../components/home/Ticker'
import muralImg from '../assets/mural.jpg'
import './Home.css'

export default function Home() {
  return (
    <div className="home-page">

      {/* One rigid block — background + flower + content all scroll as a unit */}
      <div className="home-hero-section">

        <div className="home-scene">
          <div className="home-mural" aria-hidden="true">
            <img src={muralImg} alt="" className="home-mural-img" />
            <img src={muralImg} alt="" className="home-mural-bloom" />
            <div className="home-mural-corona" />
          </div>
          <ParallaxScene />
          <div className="home-gradient-floor" />
        </div>

        <ModelNav />

        {/* ── Corner image credit ── */}
        <div className="home-credit" aria-label="Image credits">
          <span className="home-credit-label">Art</span>
          <span className="home-credit-text">
            Mural &amp; cards — <em>Arcane</em> © Riot Games / Fortiche Productions
          </span>
        </div>

        <motion.div
          className="home-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 1.0 }}
        >
          <div className="home-main">
            <div className="home-hero">
              <HeroText />
            </div>
            <div className="home-spacer" />
            <div className="home-feed">
              <FeedPreview />
            </div>
          </div>
        </motion.div>

      </div>

      <div className="home-ticker">
        <Ticker />
      </div>

    </div>
  )
}
