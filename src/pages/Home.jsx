import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ParallaxScene from '../components/home/ParallaxScene'
import HeroText from '../components/home/HeroText'
import FeedPreview from '../components/home/FeedPreview'
import Ticker from '../components/home/Ticker'
import './Home.css'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/* ── Art Nouveau decorative overlay SVG ── */
function ArtNouveauOverlay() {
  return (
    <svg
      className="artnv-overlay"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ═══ CORNER MEDALLIONS ═══ */}

      {/* Top-left */}
      <g transform="translate(72,72)" opacity="0.13">
        <circle r="66" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.7"/>
        <circle r="60" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.3"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-46" rx="7" ry="17" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="28" fill="none" stroke="rgba(45,120,112,1)" strokeWidth="0.5"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-18" rx="4.5" ry="11" fill="rgba(45,120,112,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="7" fill="rgba(201,168,71,1)"/>
        <circle r="3.5" fill="rgba(6,14,12,1)"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <circle key={a} cx={Math.round(66*Math.sin(a*Math.PI/180))} cy={Math.round(-66*Math.cos(a*Math.PI/180))} r="2.5" fill="rgba(201,168,71,1)"/>
        ))}
      </g>

      {/* Top-right */}
      <g transform="translate(1368,72)" opacity="0.13">
        <circle r="66" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.7"/>
        <circle r="60" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.3"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-46" rx="7" ry="17" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="28" fill="none" stroke="rgba(200,122,88,1)" strokeWidth="0.5"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-18" rx="4.5" ry="11" fill="rgba(200,122,88,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="7" fill="rgba(201,168,71,1)"/>
        <circle r="3.5" fill="rgba(6,14,12,1)"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <circle key={a} cx={Math.round(66*Math.sin(a*Math.PI/180))} cy={Math.round(-66*Math.cos(a*Math.PI/180))} r="2.5" fill="rgba(201,168,71,1)"/>
        ))}
      </g>

      {/* Bottom-left */}
      <g transform="translate(72,828)" opacity="0.10">
        <circle r="58" fill="none" stroke="rgba(45,120,112,1)" strokeWidth="0.6"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-40" rx="6" ry="15" fill="rgba(45,120,112,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="22" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.4"/>
        {[0,90,180,270].map(a => (
          <ellipse key={a} cx="0" cy="-14" rx="4" ry="9" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="6" fill="rgba(200,122,88,1)"/>
      </g>

      {/* Bottom-right */}
      <g transform="translate(1368,828)" opacity="0.10">
        <circle r="58" fill="none" stroke="rgba(154,56,85,1)" strokeWidth="0.6"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-40" rx="6" ry="15" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="22" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.4"/>
        {[0,90,180,270].map(a => (
          <ellipse key={a} cx="0" cy="-14" rx="4" ry="9" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="6" fill="rgba(154,56,85,1)"/>
      </g>

      {/* ═══ TOP BORDER RUNNER ═══ */}
      <g opacity="0.09">
        {/* main stem */}
        <path d="M144 44 C220 36 300 50 380 38 C460 26 540 48 620 40 C700 32 780 50 860 40 C940 30 1020 48 1100 38 C1180 28 1260 46 1296 44"
          stroke="rgba(201,168,71,1)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        {/* accent buds along top */}
        {[220, 380, 540, 720, 860, 1020, 1180].map((bx, i) => (
          <g key={i} transform={`translate(${bx}, 42)`}>
            <ellipse cx="0" cy="-8" rx="2.5" ry="7" fill="rgba(201,168,71,1)"/>
            <ellipse cx="-5" cy="-5" rx="2" ry="5" fill="rgba(45,120,112,1)" transform="rotate(-22)"/>
            <ellipse cx="5" cy="-5" rx="2" ry="5" fill="rgba(45,120,112,1)" transform="rotate(22)"/>
          </g>
        ))}
        {/* small leaf pairs */}
        {[300, 460, 620, 780, 940, 1100].map((bx, i) => (
          <g key={i} transform={`translate(${bx}, 43)`}>
            <ellipse cx="-6" cy="-3" rx="2" ry="6" fill="rgba(45,120,112,1)" transform="rotate(-35)"/>
            <ellipse cx="6" cy="-3" rx="2" ry="6" fill="rgba(45,120,112,1)" transform="rotate(35)"/>
          </g>
        ))}
      </g>

      {/* ═══ LEFT BORDER RUNNER ═══ */}
      <g opacity="0.08">
        <path d="M44 144 C36 220 50 300 38 390 C26 480 48 560 36 640 C24 720 46 790 44 828"
          stroke="rgba(45,120,112,1)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        {[240, 360, 480, 600, 720].map((by, i) => (
          <g key={i} transform={`translate(42, ${by})`}>
            <ellipse cx="8" cy="0" rx="7" ry="2.5" fill="rgba(45,120,112,1)"/>
            <ellipse cx="5" cy="-5" rx="5" ry="2" fill="rgba(201,168,71,1)" transform="rotate(-20)"/>
            <ellipse cx="5" cy="5" rx="5" ry="2" fill="rgba(201,168,71,1)" transform="rotate(20)"/>
          </g>
        ))}
      </g>

      {/* ═══ RIGHT BORDER RUNNER ═══ */}
      <g opacity="0.07">
        <path d="M1396 144 C1404 220 1390 300 1402 390 C1414 480 1392 560 1404 640 C1416 720 1394 790 1396 828"
          stroke="rgba(200,122,88,1)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        {[240, 380, 520, 660, 760].map((by, i) => (
          <g key={i} transform={`translate(1398, ${by})`}>
            <ellipse cx="-8" cy="0" rx="7" ry="2.5" fill="rgba(200,122,88,1)"/>
            <ellipse cx="-5" cy="-5" rx="5" ry="2" fill="rgba(201,168,71,1)" transform="rotate(20)"/>
            <ellipse cx="-5" cy="5" rx="5" ry="2" fill="rgba(201,168,71,1)" transform="rotate(-20)"/>
          </g>
        ))}
      </g>

      {/* ═══ TOP-CENTRE ARCH / NIMBUS ═══ */}
      <g transform="translate(720,0)" opacity="0.07">
        {/* fan of radiating lines downward */}
        {[-80,-60,-40,-20,0,20,40,60,80].map((angle, i) => (
          <line key={i}
            x1="0" y1="0"
            x2={Math.round(320*Math.sin(angle*Math.PI/180))}
            y2={Math.round(320*Math.cos(angle*Math.PI/180))}
            stroke="rgba(201,168,71,1)" strokeWidth="0.6"/>
        ))}
        {/* arch arc */}
        <path d="M-200 0 C-200 120 -100 200 0 220 C100 200 200 120 200 0"
          stroke="rgba(201,168,71,1)" strokeWidth="0.8" fill="none"/>
        <path d="M-160 0 C-160 100 -80 170 0 185 C80 170 160 100 160 0"
          stroke="rgba(201,168,71,1)" strokeWidth="0.4" fill="none"/>
        {/* centre fleuron */}
        <circle cx="0" cy="0" r="10" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.8"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-6" rx="2" ry="5" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
      </g>

      {/* ═══ SCATTERED MID-FIELD FLORALS ═══ */}

      {/* Rose — upper centre-left */}
      <g transform="translate(380, 180)" opacity="0.08">
        {[0,36,72,108,144,180,216,252,288,324].map(a => (
          <ellipse key={a} cx="0" cy="-24" rx="6" ry="16" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="7" fill="rgba(201,168,71,1)"/>
        <circle r="3.5" fill="rgba(6,14,12,1)"/>
      </g>

      {/* Lily — centre */}
      <g transform="translate(720, 420)" opacity="0.06">
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-30" rx="7" ry="20" fill="rgba(200,122,88,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="9" fill="rgba(201,168,71,1)"/>
        <circle r="4" fill="rgba(6,14,12,1)"/>
      </g>

      {/* Poppy — lower left mid */}
      <g transform="translate(290, 620)" opacity="0.07">
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-20" rx="5" ry="14" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="6" fill="rgba(45,120,112,1)"/>
      </g>

      {/* Peony — centre-right mid */}
      <g transform="translate(980, 280)" opacity="0.07">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
          <ellipse key={a} cx="0" cy="-18" rx="5" ry="12" fill="rgba(200,122,88,1)" transform={`rotate(${a})`}/>
        ))}
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-10" rx="3" ry="7" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="5" fill="rgba(201,168,71,1)"/>
      </g>

      {/* Small accent bloom — upper right quad */}
      <g transform="translate(1100, 160)" opacity="0.08">
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-16" rx="4" ry="11" fill="rgba(45,120,112,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="5" fill="rgba(201,168,71,1)"/>
      </g>

      {/* Small accent bloom — lower centre */}
      <g transform="translate(640, 750)" opacity="0.07">
        {[0,72,144,216,288].map(a => (
          <ellipse key={a} cx="0" cy="-18" rx="5" ry="13" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="5" fill="rgba(200,122,88,1)"/>
      </g>

      {/* ═══ VINE TENDRILS connecting florals ═══ */}
      <g opacity="0.055" fill="none" strokeLinecap="round">
        <path d="M144 80 C200 120 280 150 380 180"  stroke="rgba(201,168,71,1)" strokeWidth="0.8"/>
        <path d="M380 180 C480 210 580 260 720 420" stroke="rgba(45,120,112,1)" strokeWidth="0.7"/>
        <path d="M720 420 C820 460 900 520 980 280" stroke="rgba(200,122,88,1)" strokeWidth="0.7"/>
        <path d="M380 180 C340 320 310 470 290 620" stroke="rgba(45,120,112,1)" strokeWidth="0.6"/>
        <path d="M1368 80 C1300 130 1200 150 1100 160" stroke="rgba(201,168,71,1)" strokeWidth="0.8"/>
        <path d="M1100 160 C1040 200 980 240 980 280" stroke="rgba(200,122,88,1)" strokeWidth="0.6"/>
        {/* Curlicues */}
        <path d="M430 180 C442 172 450 160 442 152 C434 144 424 152 428 160 C432 168 444 168 444 162"
          stroke="rgba(201,168,71,1)" strokeWidth="0.6"/>
        <path d="M320 620 C332 612 338 600 330 594 C322 588 312 596 318 604 C324 612 336 610 334 604"
          stroke="rgba(45,120,112,1)" strokeWidth="0.6"/>
        <path d="M1030 285 C1042 276 1048 264 1040 258 C1032 252 1022 260 1028 268 C1034 276 1046 274 1044 268"
          stroke="rgba(200,122,88,1)" strokeWidth="0.6"/>
      </g>

      {/* ═══ BORDER CORNER FLOURISHES (diagonal lines from corners) ═══ */}
      <g opacity="0.06" stroke="rgba(201,168,71,1)" fill="none" strokeLinecap="round">
        <path d="M144 72 C160 100 172 130 160 160" strokeWidth="0.7"/>
        <path d="M72 144 C100 160 130 172 160 160" strokeWidth="0.7"/>
        <path d="M1296 72 C1280 100 1268 130 1280 160" strokeWidth="0.7"/>
        <path d="M1368 144 C1340 160 1310 172 1280 160" strokeWidth="0.7"/>
      </g>

      {/* ═══ BOTTOM BORDER RUNNER ═══ */}
      <g opacity="0.07">
        <path d="M144 870 C280 862 420 876 560 866 C700 856 840 874 980 864 C1100 854 1220 870 1296 866"
          stroke="rgba(45,120,112,1)" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
        {[300, 500, 720, 940, 1140].map((bx, i) => (
          <g key={i} transform={`translate(${bx}, 868)`}>
            <ellipse cx="0" cy="8" rx="2" ry="6" fill="rgba(45,120,112,1)"/>
            <ellipse cx="-5" cy="5" rx="2" ry="4" fill="rgba(201,168,71,1)" transform="rotate(22)"/>
            <ellipse cx="5" cy="5" rx="2" ry="4" fill="rgba(201,168,71,1)" transform="rotate(-22)"/>
          </g>
        ))}
      </g>
    </svg>
  )
}

export default function Home() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const pageRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (isTouch || !pageRef.current) return
    const rect = pageRef.current.getBoundingClientRect()
    setMouse({
      x: e.clientX - rect.width / 2,
      y: e.clientY - rect.height / 2,
    })
  }, [])

  return (
    <div className="home-page" ref={pageRef} onMouseMove={handleMouseMove}>
      <div className="home-scene">
        <ArtNouveauOverlay />
        <ParallaxScene mouse={mouse} />
        <div className="home-gradient-floor" />
      </div>

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

      <div className="home-ticker">
        <Ticker />
      </div>
    </div>
  )
}
