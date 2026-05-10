import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import ChapterCard from '../ui/ChapterCard'
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

      <motion.p className="hero-sub" variants={item}>
        a personal archive of obsessions — books, films, sounds, &amp; half-finished thoughts
      </motion.p>

      <motion.div className="hero-ctas" variants={item}>
        <Link to="/library" className="btn btn-yellow">
          ↗ Enter the Archive
        </Link>
        <Link to="/music" className="btn btn-red">
          ♪ Play Something
        </Link>
      </motion.div>
    </motion.div>
  )
}
