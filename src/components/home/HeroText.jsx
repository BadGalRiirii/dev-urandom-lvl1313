import { motion } from 'framer-motion'
import ChapterCard from '../ui/ChapterCard'
import artnoImg from '../../assets/ARTNO.jpg'
import cait2Img from '../../assets/cait2.jpg'
import jinxImg  from '../../assets/jinx.jpg'
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

      <motion.div variants={item} className="hero-deck">

        {/* Back — Game Mode */}
        <button className="deck-card deck-game" aria-disabled="true" tabIndex={-1}>
          <img src={artnoImg} alt="" className="deck-img" draggable={false} />
          <div className="deck-frame" />
          <div className="deck-label">
            <span className="deck-ornament">✦ ✦ ✦</span>
            <span className="deck-title">Game Mode</span>
            <span className="deck-sub">coming soon</span>
          </div>
          <div className="deck-corona" />
        </button>

        {/* Middle — Jinx */}
        <button className="deck-card deck-jinx" aria-disabled="true" tabIndex={-1}>
          <img src={jinxImg} alt="" className="deck-img" draggable={false} />
          <div className="deck-frame" />
          <div className="deck-label">
            <span className="deck-ornament">✦ ✦ ✦</span>
            <span className="deck-title">Chapter II</span>
            <span className="deck-sub">coming soon</span>
          </div>
          <div className="deck-corona" />
        </button>

        {/* Front — Portfolio */}
        <a
          href="https://badgalriirii.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="deck-card deck-portfolio"
        >
          <img src={cait2Img} alt="Portfolio" className="deck-img" draggable={false} />
          <div className="deck-frame" />
          <div className="deck-label">
            <span className="deck-ornament">✦ ✦ ✦</span>
            <span className="deck-title">Portfolio</span>
            <span className="deck-sub">view work →</span>
          </div>
          <div className="deck-corona" />
        </a>

      </motion.div>

    </motion.div>
  )
}
