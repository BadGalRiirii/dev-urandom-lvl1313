import { motion } from 'framer-motion'
import ChapterCard from '../ui/ChapterCard'
import artnoImg from '../../assets/ARTNO.jpg'
import './HeroText.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] } },
}

export default function HeroText() {
  return (
    <motion.div className="hero" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="hero-chapter-stamp">
        <ChapterCard volume="Vol. I" title="Selected Works" stamp="riri/dev/urandom" />
      </motion.div>

      <motion.div variants={item} className="hero-ornament">
        <span className="hero-ornament-line" />
        <span className="hero-ornament-mark">✦</span>
        <span className="hero-ornament-line right" />
      </motion.div>

      <motion.h1 className="hero-title display" variants={item}>
        Every<br />
        <span className="text-red">thing</span>{' '}
        <span className="text-yellow">I</span><br />
        Loved
      </motion.h1>

      <motion.div variants={item} className="hero-title-rule">
        <span className="htr-line" />
        <span className="htr-glyph">❧</span>
        <span className="htr-line htr-line--long" />
      </motion.div>

      <motion.p className="hero-sub" variants={item}>
        a personal archive of obsessions — books, films, sounds, &amp; half-finished thoughts
      </motion.p>

      <motion.div variants={item} className="fruit-card-wrap">
        <button className="fruit-card" aria-disabled="true" tabIndex={-1} title="Coming soon — hand tracking game">
          <img src={artnoImg} alt="" className="fruit-card-img" draggable={false} />

          {/* inner gold rule frame */}
          <div className="fruit-card-frame" />

          {/* bottom label panel */}
          <div className="fruit-card-label">
            <span className="fruit-card-ornament">✦ ✦ ✦</span>
            <span className="fruit-card-title">Game Mode</span>
            <span className="fruit-card-sub">coming soon</span>
          </div>

          {/* hover glow corona */}
          <div className="fruit-card-corona" />
        </button>
      </motion.div>

    </motion.div>
  )
}
