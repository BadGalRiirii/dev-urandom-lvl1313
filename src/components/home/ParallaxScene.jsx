import { useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import './ParallaxScene.css'

const BOOKS = [
  { color: '#0d2825', width: 26, height: 152, x: '7%',    y: '33%', rot: -3 },
  { color: '#1d3830', width: 20, height: 170, x: '9.2%',  y: '33%', rot: 1 },
  { color: '#c9a847', width: 30, height: 140, x: '11.6%', y: '33%', rot: -1.5 },
  { color: '#132420', width: 16, height: 162, x: '13.8%', y: '33%', rot: 2 },
  { color: '#9a3855', width: 24, height: 148, x: '15.2%', y: '33%', rot: -2 },
  { color: '#2d7870', width: 22, height: 158, x: '16.8%', y: '33%', rot: 1.5 },
  { color: '#1a3028', width: 18, height: 136, x: '18.2%', y: '33%', rot: -1 },
]

const CDS = [
  { x: '74%', y: '22%' },
  { x: '80%', y: '58%' },
]

function BookStack({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 55, damping: 22 })
  const y = useSpring(useMotionValue(0), { stiffness: 55, damping: 22 })
  useEffect(() => { x.set(mouse.x * 0.007); y.set(mouse.y * 0.007) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-books" style={{ x, y }}>
      {BOOKS.map((b, i) => (
        <div
          key={i}
          className="book-spine-parallax"
          style={{
            background: b.color,
            width: b.width, height: b.height,
            left: b.x, top: b.y,
            transform: `rotate(${b.rot}deg)`,
          }}
        >
          <div className="book-spine-line" />
        </div>
      ))}
    </motion.div>
  )
}

function CDisc({ disc, mouse, depth }) {
  const x = useSpring(useMotionValue(0), { stiffness: 38, damping: 16 })
  const y = useSpring(useMotionValue(0), { stiffness: 38, damping: 16 })
  useEffect(() => { x.set(mouse.x * depth); y.set(mouse.y * depth) }, [mouse.x, mouse.y, x, y, depth])

  return (
    <motion.div className="parallax-cd-wrap" style={{ x, y, left: disc.x, top: disc.y }}>
      <div className="parallax-cd">
        <div className="parallax-cd-sheen" />
        <div className="parallax-cd-label" />
        <div className="parallax-cd-hole" />
      </div>
    </motion.div>
  )
}

function BotanicalVines({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 18, damping: 22 })
  const y = useSpring(useMotionValue(0), { stiffness: 18, damping: 22 })
  useEffect(() => { x.set(mouse.x * -0.006); y.set(mouse.y * -0.006) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-botanical" style={{ x, y }}>
      <svg className="botanical-svg" viewBox="0 0 260 520" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main stem */}
        <path d="M130 520 C128 420 118 380 105 310 C92 240 88 200 95 140 C100 100 120 70 130 20"
          stroke="rgba(201,168,71,0.1)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Left branches */}
        <path d="M105 310 C80 290 55 285 30 270" stroke="rgba(200,122,88,0.09)" strokeWidth="1" strokeLinecap="round" />
        <path d="M110 250 C88 230 65 232 42 218" stroke="rgba(201,168,71,0.07)" strokeWidth="1" strokeLinecap="round" />
        <path d="M100 185 C75 168 52 172 28 162" stroke="rgba(200,122,88,0.07)" strokeWidth="1" strokeLinecap="round" />
        {/* Right branches */}
        <path d="M105 310 C130 288 158 282 182 265" stroke="rgba(201,168,71,0.08)" strokeWidth="1" strokeLinecap="round" />
        <path d="M110 250 C136 228 160 230 188 214" stroke="rgba(200,122,88,0.07)" strokeWidth="1" strokeLinecap="round" />
        <path d="M100 185 C126 166 150 170 176 158" stroke="rgba(201,168,71,0.06)" strokeWidth="1" strokeLinecap="round" />
        {/* Leaf tips */}
        <ellipse cx="28" cy="268" rx="7" ry="12" transform="rotate(-25 28 268)" fill="rgba(45,120,112,0.07)" />
        <ellipse cx="182" cy="263" rx="7" ry="12" transform="rotate(30 182 263)" fill="rgba(45,120,112,0.07)" />
        <ellipse cx="40" cy="214" rx="6" ry="10" transform="rotate(-20 40 214)" fill="rgba(45,120,112,0.06)" />
        <ellipse cx="188" cy="210" rx="6" ry="10" transform="rotate(25 188 210)" fill="rgba(45,120,112,0.06)" />
        <ellipse cx="26" cy="160" rx="5" ry="9" transform="rotate(-15 26 160)" fill="rgba(45,120,112,0.05)" />
        {/* Gold accent dots - like a botanical illustration */}
        <circle cx="95" cy="140" r="3.5" fill="none" stroke="rgba(201,168,71,0.18)" />
        <circle cx="130" cy="20"  r="5"   fill="none" stroke="rgba(201,168,71,0.14)" />
        <circle cx="30"  cy="270" r="2.5" fill="rgba(201,168,71,0.12)" />
        <circle cx="182" cy="265" r="2.5" fill="rgba(201,168,71,0.12)" />
      </svg>
    </motion.div>
  )
}

export default function ParallaxScene({ mouse }) {
  return (
    <div className="parallax-scene">
      {/* Botanical glow leaks */}
      <motion.div className="leak leak-teal"
        animate={{ scale: [1, 1.12, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div className="leak leak-rose"
        animate={{ scale: [1, 1.18, 1], opacity: [0.04, 0.07, 0.04] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div className="leak leak-gold"
        animate={{ scale: [1, 1.1, 1], opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      <BookStack mouse={mouse} />

      {CDS.map((d, i) => (
        <CDisc key={i} disc={d} mouse={mouse} depth={0.014 + i * 0.006} />
      ))}

      <BotanicalVines mouse={mouse} />
    </div>
  )
}
