import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import abbaImg   from '../../assets/ABBA.png'
import queenImg  from '../../assets/QUEEN.png'
import caitImg   from '../../assets/CAIT-ARTNV.jpg'
import liliesImg from '../../assets/WHITELILIES.jpg'
import cait2Img  from '../../assets/cait2.jpg'
import jinxImg   from '../../assets/jinx.jpg'
import './ParallaxScene.css'

/* Drop abba.mp3 and queen.mp3 into /public to activate audio */

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
  { x: '55%', y: '8%',  img: abbaImg,  audio: '/abba.mp3',  label: 'ABBA'  },
  { x: '60%', y: '50%', img: queenImg, audio: '/queen.mp3', label: 'QUEEN' },
]

let _activeAudio      = null
let _activeSetPlaying = null

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
  const mx        = useSpring(useMotionValue(0), { stiffness: 38, damping: 16 })
  const my        = useSpring(useMotionValue(0), { stiffness: 38, damping: 16 })
  const audioRef  = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => { mx.set(mouse.x * depth); my.set(mouse.y * depth) }, [mouse.x, mouse.y, mx, my, depth])

  useEffect(() => {
    const audio = new Audio(disc.audio)
    audio.loop = true
    audioRef.current = audio
    return () => { audio.pause(); audioRef.current = null }
  }, [disc.audio])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      if (_activeAudio === audio) { _activeAudio = null; _activeSetPlaying = null }
    } else {
      if (_activeAudio && _activeAudio !== audio) {
        _activeAudio.pause()
        _activeSetPlaying?.(false)
      }
      _activeAudio      = audio
      _activeSetPlaying = setPlaying
      audio.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  return (
    <motion.div
      className={`parallax-cd-wrap${playing ? ' is-playing' : ''}`}
      style={{ x: mx, y: my, left: disc.x, top: disc.y }}
    >
      <div className="parallax-cd-glow" />

      <button
        className={`parallax-cd${playing ? ' playing' : ''}`}
        onClick={toggle}
        aria-label={playing ? `Pause ${disc.label}` : `Play ${disc.label}`}
        title={playing ? `Pause ${disc.label}` : `Play ${disc.label}`}
      >
        <img src={disc.img} alt={disc.label} className="parallax-cd-img" draggable={false} />
        <div className="parallax-cd-sheen" />
        <div className="parallax-cd-hole" />
        <div className={`parallax-cd-play-icon${playing ? ' hide' : ''}`}>▶</div>
      </button>

      <div className="parallax-cd-label-tag">{disc.label}</div>
    </motion.div>
  )
}

function BotanicalVines({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 18, damping: 22 })
  const y = useSpring(useMotionValue(0), { stiffness: 18, damping: 22 })
  useEffect(() => { x.set(mouse.x * -0.006); y.set(mouse.y * -0.006) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-botanical" style={{ x, y }}>
      <svg className="botanical-svg" viewBox="0 0 280 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M140 600 C136 480 122 430 108 345 C94 260 90 210 98 145 C104 102 126 68 140 14"
          stroke="rgba(201,168,71,0.13)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M108 345 C80 320 50 315 22 298" stroke="rgba(200,122,88,0.10)" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M100 275 C74 252 46 256 18 240" stroke="rgba(201,168,71,0.08)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M98 210 C70 192 44 196 16 182"  stroke="rgba(200,122,88,0.08)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M102 155 C78 138 52 140 28 128"  stroke="rgba(201,168,71,0.07)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M108 345 C136 318 168 312 198 294" stroke="rgba(201,168,71,0.09)" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M100 275 C128 250 160 252 192 236" stroke="rgba(200,122,88,0.08)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M98 210 C126 190 158 192 188 176"  stroke="rgba(201,168,71,0.07)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M102 155 C130 136 162 138 194 124" stroke="rgba(200,122,88,0.06)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M22 298 C10 292 6 280 14 272 C22 264 34 270 32 280 C30 290 18 294 14 288"
          stroke="rgba(201,168,71,0.15)" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
        <path d="M198 294 C212 287 218 274 210 266 C202 258 190 264 193 274 C196 284 210 288 214 282"
          stroke="rgba(201,168,71,0.14)" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
        <path d="M18 240 C5 234 2 220 11 213 C20 206 32 213 29 222 C26 232 12 234 9 228"
          stroke="rgba(200,122,88,0.13)" strokeWidth="0.7" strokeLinecap="round" fill="none"/>
        <g opacity="0.18" transform="translate(176, 128)">
          <ellipse cx="0" cy="-22" rx="6" ry="18" fill="rgba(200,140,110,1)" transform="rotate(0)"/>
          <ellipse cx="0" cy="-22" rx="6" ry="18" fill="rgba(200,140,110,1)" transform="rotate(60)"/>
          <ellipse cx="0" cy="-22" rx="6" ry="18" fill="rgba(200,140,110,1)" transform="rotate(120)"/>
          <ellipse cx="0" cy="-22" rx="6" ry="18" fill="rgba(200,140,110,1)" transform="rotate(180)"/>
          <ellipse cx="0" cy="-22" rx="6" ry="18" fill="rgba(200,140,110,1)" transform="rotate(240)"/>
          <ellipse cx="0" cy="-22" rx="6" ry="18" fill="rgba(200,140,110,1)" transform="rotate(300)"/>
          <circle cx="0" cy="0" r="5" fill="rgba(201,168,71,1)"/>
          <line x1="0" y1="0" x2="0" y2="-14"  stroke="rgba(201,168,71,0.7)" strokeWidth="0.8"/>
          <line x1="0" y1="0" x2="8" y2="-11"  stroke="rgba(201,168,71,0.6)" strokeWidth="0.8"/>
          <line x1="0" y1="0" x2="-8" y2="-11" stroke="rgba(201,168,71,0.6)" strokeWidth="0.8"/>
          <circle cx="0" cy="-14"  r="1.5" fill="rgba(201,168,71,0.9)"/>
          <circle cx="8" cy="-11"  r="1.5" fill="rgba(201,168,71,0.8)"/>
          <circle cx="-8" cy="-11" r="1.5" fill="rgba(201,168,71,0.8)"/>
        </g>
        <g opacity="0.14" transform="translate(14, 240)">
          <ellipse cx="-8" cy="0" rx="5" ry="14" fill="rgba(154,56,85,1)" transform="rotate(-20 -8 0)"/>
          <ellipse cx="0"  cy="-4" rx="5" ry="16" fill="rgba(200,122,88,1)" transform="rotate(-5)"/>
          <ellipse cx="8"  cy="0" rx="5" ry="14" fill="rgba(154,56,85,1)" transform="rotate(20 8 0)"/>
          <line x1="0" y1="-16" x2="0" y2="-24" stroke="rgba(201,168,71,0.8)" strokeWidth="0.8"/>
          <line x1="0" y1="-16" x2="5" y2="-22" stroke="rgba(201,168,71,0.6)" strokeWidth="0.7"/>
          <circle cx="0" cy="-24" r="1.2" fill="rgba(201,168,71,0.9)"/>
          <circle cx="5" cy="-22" r="1"   fill="rgba(201,168,71,0.8)"/>
        </g>
        <g opacity="0.12" transform="translate(22, 298)">
          <ellipse cx="-5" cy="-4" rx="4" ry="11" fill="rgba(200,122,88,1)" transform="rotate(-15 -5 -4)"/>
          <ellipse cx="0"  cy="-6" rx="4" ry="13" fill="rgba(200,140,110,1)"/>
          <ellipse cx="5"  cy="-4" rx="4" ry="11" fill="rgba(154,56,85,1)"  transform="rotate(15 5 -4)"/>
        </g>
        <g opacity="0.13" transform="translate(196, 236)">
          <ellipse cx="0" cy="-18" rx="5" ry="15" fill="rgba(154,56,85,1)" transform="rotate(0)"/>
          <ellipse cx="0" cy="-18" rx="5" ry="15" fill="rgba(154,56,85,1)" transform="rotate(72)"/>
          <ellipse cx="0" cy="-18" rx="5" ry="15" fill="rgba(200,122,88,1)" transform="rotate(144)"/>
          <ellipse cx="0" cy="-18" rx="5" ry="15" fill="rgba(200,122,88,1)" transform="rotate(216)"/>
          <ellipse cx="0" cy="-18" rx="5" ry="15" fill="rgba(154,56,85,1)" transform="rotate(288)"/>
          <circle cx="0" cy="0" r="4" fill="rgba(201,168,71,1)"/>
          <line x1="0" y1="0" x2="0" y2="-12"  stroke="rgba(201,168,71,0.7)" strokeWidth="0.7"/>
          <line x1="0" y1="0" x2="7" y2="-9"   stroke="rgba(201,168,71,0.6)" strokeWidth="0.7"/>
          <line x1="0" y1="0" x2="-7" y2="-9"  stroke="rgba(201,168,71,0.6)" strokeWidth="0.7"/>
          <circle cx="0"  cy="-12" r="1.2" fill="rgba(201,168,71,0.9)"/>
          <circle cx="7"  cy="-9"  r="1.2" fill="rgba(201,168,71,0.8)"/>
          <circle cx="-7" cy="-9"  r="1.2" fill="rgba(201,168,71,0.8)"/>
        </g>
        <ellipse cx="22"  cy="296" rx="8"  ry="15" transform="rotate(-28 22 296)"  fill="rgba(45,120,112,0.09)"/>
        <ellipse cx="198" cy="292" rx="8"  ry="15" transform="rotate(33 198 292)"  fill="rgba(45,120,112,0.09)"/>
        <ellipse cx="18"  cy="238" rx="7"  ry="13" transform="rotate(-22 18 238)"  fill="rgba(45,120,112,0.08)"/>
        <ellipse cx="192" cy="234" rx="7"  ry="13" transform="rotate(28 192 234)"  fill="rgba(45,120,112,0.08)"/>
        <ellipse cx="16"  cy="180" rx="6"  ry="11" transform="rotate(-18 16 180)"  fill="rgba(45,120,112,0.07)"/>
        <ellipse cx="188" cy="174" rx="6"  ry="11" transform="rotate(24 188 174)"  fill="rgba(45,120,112,0.07)"/>
        <ellipse cx="28"  cy="128" rx="5"  ry="9"  transform="rotate(-14 28 128)"  fill="rgba(45,120,112,0.06)"/>
        <ellipse cx="192" cy="122" rx="5"  ry="9"  transform="rotate(20 192 122)"  fill="rgba(45,120,112,0.06)"/>
        <circle cx="98"  cy="145" r="4" fill="none" stroke="rgba(201,168,71,0.22)"/>
        <circle cx="140" cy="14"  r="6" fill="none" stroke="rgba(201,168,71,0.18)"/>
        <circle cx="22"  cy="298" r="3" fill="rgba(201,168,71,0.15)"/>
        <circle cx="198" cy="294" r="3" fill="rgba(201,168,71,0.15)"/>
        <circle cx="18"  cy="240" r="2.5" fill="rgba(200,122,88,0.18)"/>
        <circle cx="192" cy="236" r="2.5" fill="rgba(200,122,88,0.18)"/>
        <ellipse cx="55"  cy="180" rx="3" ry="6" transform="rotate(-40 55 180)"  fill="rgba(200,122,88,0.07)"/>
        <ellipse cx="220" cy="200" rx="3" ry="6" transform="rotate(35 220 200)"   fill="rgba(154,56,85,0.07)"/>
        <ellipse cx="60"  cy="320" rx="2.5" ry="5" transform="rotate(-30 60 320)" fill="rgba(200,122,88,0.06)"/>
        <ellipse cx="210" cy="260" rx="2.5" ry="5" transform="rotate(28 210 260)"  fill="rgba(201,168,71,0.06)"/>
        <path d="M60 30 C80 12 100 8 140 14 C180 20 200 12 220 30"
          stroke="rgba(201,168,71,0.12)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M60 30 C64 24 58 18 62 12" stroke="rgba(201,168,71,0.1)" strokeWidth="0.8" fill="none"/>
        <path d="M220 30 C216 24 222 18 218 12" stroke="rgba(201,168,71,0.1)" strokeWidth="0.8" fill="none"/>
        <circle cx="62" cy="12" r="2" fill="rgba(201,168,71,0.14)"/>
        <circle cx="218" cy="12" r="2" fill="rgba(201,168,71,0.14)"/>
      </svg>
    </motion.div>
  )
}

function BotanicalLeft({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 14, damping: 24 })
  const y = useSpring(useMotionValue(0), { stiffness: 14, damping: 24 })
  useEffect(() => { x.set(mouse.x * 0.004); y.set(mouse.y * 0.004) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-botanical-left" style={{ x, y }}>
      <svg viewBox="0 0 160 440" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M80 440 C78 360 70 320 62 260 C54 200 52 165 58 115 C62 82 74 52 80 10"
          stroke="rgba(45,120,112,0.08)" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M62 260 C84 242 106 244 126 232" stroke="rgba(45,120,112,0.07)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M60 200 C82 182 104 184 124 170" stroke="rgba(201,168,71,0.06)" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M58 145 C80 127 102 130 122 116" stroke="rgba(45,120,112,0.06)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M62 260 C40 242 18 246 -4 230"  stroke="rgba(200,122,88,0.06)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M60 200 C38 182 16 186 -6 170"  stroke="rgba(45,120,112,0.05)" strokeWidth="0.9" strokeLinecap="round"/>
        <ellipse cx="126" cy="230" rx="6" ry="10" transform="rotate(30 126 230)"  fill="rgba(45,120,112,0.07)"/>
        <ellipse cx="-4"  cy="228" rx="6" ry="10" transform="rotate(-25 -4 228)"  fill="rgba(45,120,112,0.06)"/>
        <ellipse cx="124" cy="168" rx="5" ry="9"  transform="rotate(26 124 168)"  fill="rgba(45,120,112,0.06)"/>
        <g opacity="0.1" transform="translate(124, 118)">
          <ellipse cx="-4" cy="-4" rx="3.5" ry="9" fill="rgba(200,122,88,1)" transform="rotate(-15 -4 -4)"/>
          <ellipse cx="0"  cy="-6" rx="3.5" ry="11" fill="rgba(200,140,110,1)"/>
          <ellipse cx="4"  cy="-4" rx="3.5" ry="9" fill="rgba(154,56,85,1)"  transform="rotate(15 4 -4)"/>
        </g>
        <circle cx="80"  cy="10"  r="4.5" fill="none" stroke="rgba(201,168,71,0.14)"/>
        <circle cx="58"  cy="115" r="3"   fill="rgba(201,168,71,0.12)"/>
        <circle cx="126" cy="232" r="2"   fill="rgba(200,122,88,0.14)"/>
      </svg>
    </motion.div>
  )
}

/* ── Mucha-style portrait — right presiding figure ── */
function FloatingPortrait({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 16, damping: 24 })
  const y = useSpring(useMotionValue(0), { stiffness: 16, damping: 24 })
  useEffect(() => { x.set(mouse.x * 0.013); y.set(mouse.y * 0.013) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-portrait" style={{ x, y }}>
      <img src={caitImg} alt="" className="parallax-portrait-img" draggable={false} />
    </motion.div>
  )
}

/* ── White lily panel — botanical canopy top-left ── */
function FloatingLilies({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 10, damping: 30 })
  const y = useSpring(useMotionValue(0), { stiffness: 10, damping: 30 })
  useEffect(() => { x.set(mouse.x * -0.008); y.set(mouse.y * -0.005) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-lilies" style={{ x, y }}>
      <img src={liliesImg} alt="" className="parallax-lilies-img" draggable={false} />
    </motion.div>
  )
}

/* ── Cait2 — mid-background, slightly left-of-centre ── */
function FloatingCait2({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 13, damping: 26 })
  const y = useSpring(useMotionValue(0), { stiffness: 13, damping: 26 })
  useEffect(() => { x.set(mouse.x * 0.009); y.set(mouse.y * 0.007) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-cait2" style={{ x, y }}>
      <img src={cait2Img} alt="" className="parallax-cait2-img" draggable={false} />
    </motion.div>
  )
}

/* ── Jinx — lower-right, depth companion ── */
function FloatingJinx({ mouse }) {
  const x = useSpring(useMotionValue(0), { stiffness: 11, damping: 28 })
  const y = useSpring(useMotionValue(0), { stiffness: 11, damping: 28 })
  useEffect(() => { x.set(mouse.x * -0.007); y.set(mouse.y * 0.011) }, [mouse.x, mouse.y, x, y])

  return (
    <motion.div className="parallax-jinx" style={{ x, y }}>
      <img src={jinxImg} alt="" className="parallax-jinx-img" draggable={false} />
    </motion.div>
  )
}

export default function ParallaxScene({ mouse }) {
  return (
    <div className="parallax-scene">
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

      <FloatingLilies   mouse={mouse} />
      <FloatingPortrait mouse={mouse} />
      <FloatingCait2    mouse={mouse} />
      <FloatingJinx     mouse={mouse} />
      <BookStack        mouse={mouse} />

      {CDS.map((d, i) => (
        <CDisc key={i} disc={d} mouse={mouse} depth={0.014 + i * 0.006} />
      ))}

      <BotanicalVines mouse={mouse} />
      <BotanicalLeft  mouse={mouse} />
    </div>
  )
}
