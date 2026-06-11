import { useRef, useCallback, memo } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import ParallaxScene from '../components/home/ParallaxScene'
import HeroText from '../components/home/HeroText'
import FeedPreview from '../components/home/FeedPreview'
import Ticker from '../components/home/Ticker'
import './Home.css'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/* ─────────────────────────────────────────────────────────────
   Art Nouveau Architectural Frame — memoized, never re-renders
───────────────────────────────────────────────────────────── */
const ArtNouveauOverlay = memo(function ArtNouveauOverlay() {
  return (
    <svg
      className="artnv-overlay"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ═══════════════════════════════════════════════
          I. TOP CENTRE ARCH — the crowning architectural frame
          Centered at x=740, glory rays + double-arch + keystone
         ═══════════════════════════════════════════════ */}
      <g transform="translate(740, 0)" opacity="0.22">
        {/* Glory rays radiating downward */}
        {[-80,-64,-48,-32,-16,0,16,32,48,64,80].map((angle, i) => (
          <line key={i}
            x1="0" y1="0"
            x2={Math.round(320 * Math.sin(angle * Math.PI / 180))}
            y2={Math.round(320 * Math.cos(angle * Math.PI / 180))}
            stroke="rgba(201,168,71,1)" strokeWidth="0.45" opacity="0.7"/>
        ))}
        {/* Outer arch */}
        <path d="M-258 0 C-258 178 -134 275 0 292 C134 275 258 178 258 0"
          stroke="rgba(201,168,71,1)" strokeWidth="1.4" fill="none"/>
        {/* Mid arch */}
        <path d="M-214 0 C-214 148 -110 231 0 246 C110 231 214 148 214 0"
          stroke="rgba(201,168,71,1)" strokeWidth="0.6" fill="none"/>
        {/* Inner arch */}
        <path d="M-172 0 C-172 120 -88 188 0 200 C88 188 172 120 172 0"
          stroke="rgba(201,168,71,0.55)" strokeWidth="0.38" fill="none"/>

        {/* Botanical buds along outer arch — left side */}
        {[200, 228, 256, 284, 312].map((deg, i) => {
          const r = 258; const rad = deg * Math.PI / 180
          const cx = Math.round(r * Math.sin(rad))
          const cy = Math.round(-r * Math.cos(rad))
          const rot = deg - 90
          return (
            <g key={`bl${i}`} transform={`translate(${cx},${cy}) rotate(${rot})`}>
              <ellipse cx="0" cy="-8" rx="2.4" ry="7" fill="rgba(45,120,112,1)"/>
              <ellipse cx="-5" cy="-5" rx="2" ry="5" fill="rgba(201,168,71,1)" transform="rotate(-22)"/>
              <ellipse cx="5"  cy="-5" rx="2" ry="5" fill="rgba(201,168,71,1)" transform="rotate(22)"/>
            </g>
          )
        })}
        {/* Botanical buds along outer arch — right side */}
        {[-200, -228, -256, -284, -312].map((deg, i) => {
          const r = 258; const rad = deg * Math.PI / 180
          const cx = Math.round(r * Math.sin(rad))
          const cy = Math.round(-r * Math.cos(rad))
          const rot = -deg - 90
          return (
            <g key={`br${i}`} transform={`translate(${cx},${cy}) rotate(${rot})`}>
              <ellipse cx="0" cy="-8" rx="2.4" ry="7" fill="rgba(45,120,112,1)"/>
              <ellipse cx="-5" cy="-5" rx="2" ry="5" fill="rgba(201,168,71,1)" transform="rotate(-22)"/>
              <ellipse cx="5"  cy="-5" rx="2" ry="5" fill="rgba(201,168,71,1)" transform="rotate(22)"/>
            </g>
          )
        })}

        {/* Keystone medallion at apex */}
        <circle r="17"  fill="none" stroke="rgba(201,168,71,1)" strokeWidth="1.2"/>
        <circle r="11"  fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.5"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-7" rx="2.3" ry="5.8" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="3.2" fill="rgba(201,168,71,1)"/>
        <circle r="1.5" fill="rgba(6,14,12,1)"/>

        {/* Diamond terminals where arch meets top edge */}
        {[-258, 258].map((dx, i) => (
          <g key={i} transform={`translate(${dx}, 0)`}>
            <rect x="-4.5" y="-4.5" width="9" height="9" fill="none"
              stroke="rgba(201,168,71,1)" strokeWidth="0.9" transform="rotate(45)"/>
            <circle r="2.2" fill="rgba(201,168,71,1)"/>
          </g>
        ))}
      </g>

      {/* ═══════════════════════════════════════════════
          II. CORNER MEDALLIONS — all four, elevated opacity
         ═══════════════════════════════════════════════ */}

      {/* Top-left */}
      <g transform="translate(66, 66)" opacity="0.26">
        <circle r="72" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="1.0"/>
        <circle r="64" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.38"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-50" rx="7.5" ry="18.5" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="31" fill="none" stroke="rgba(45,120,112,1)" strokeWidth="0.6"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-20" rx="5.2" ry="12" fill="rgba(45,120,112,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="8.5" fill="rgba(201,168,71,1)"/>
        <circle r="4.2" fill="rgba(6,14,12,1)"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <circle key={a}
            cx={Math.round(72 * Math.sin(a * Math.PI / 180))}
            cy={Math.round(-72 * Math.cos(a * Math.PI / 180))}
            r="3.0" fill="rgba(201,168,71,1)"/>
        ))}
      </g>

      {/* Top-right */}
      <g transform="translate(1374, 66)" opacity="0.26">
        <circle r="72" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="1.0"/>
        <circle r="64" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.38"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-50" rx="7.5" ry="18.5" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="31" fill="none" stroke="rgba(200,122,88,1)" strokeWidth="0.6"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-20" rx="5.2" ry="12" fill="rgba(200,122,88,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="8.5" fill="rgba(201,168,71,1)"/>
        <circle r="4.2" fill="rgba(6,14,12,1)"/>
        {[0,45,90,135,180,225,270,315].map(a => (
          <circle key={a}
            cx={Math.round(72 * Math.sin(a * Math.PI / 180))}
            cy={Math.round(-72 * Math.cos(a * Math.PI / 180))}
            r="3.0" fill="rgba(201,168,71,1)"/>
        ))}
      </g>

      {/* Bottom-left */}
      <g transform="translate(66, 834)" opacity="0.22">
        <circle r="64" fill="none" stroke="rgba(45,120,112,1)" strokeWidth="0.75"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-44" rx="6.5" ry="16.5" fill="rgba(45,120,112,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="25" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.5"/>
        {[0,90,180,270].map(a => (
          <ellipse key={a} cx="0" cy="-16" rx="4.8" ry="10" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="7.5" fill="rgba(200,122,88,1)"/>
        <circle r="3.5" fill="rgba(6,14,12,1)"/>
      </g>

      {/* Bottom-right */}
      <g transform="translate(1374, 834)" opacity="0.22">
        <circle r="64" fill="none" stroke="rgba(154,56,85,1)" strokeWidth="0.75"/>
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-44" rx="6.5" ry="16.5" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="25" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.5"/>
        {[0,90,180,270].map(a => (
          <ellipse key={a} cx="0" cy="-16" rx="4.8" ry="10" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="7.5" fill="rgba(154,56,85,1)"/>
        <circle r="3.5" fill="rgba(6,14,12,1)"/>
      </g>

      {/* ═══════════════════════════════════════════════
          III. TOP BORDER RUNNER
         ═══════════════════════════════════════════════ */}
      <g opacity="0.16">
        <path d="M138 40 C230 32 318 46 408 34 C498 22 578 44 668 36 C758 28 838 46 928 36 C1018 26 1098 44 1188 34 C1278 24 1342 42 1302 40"
          stroke="rgba(201,168,71,1)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        {[210, 370, 530, 710, 868, 1028, 1188].map((bx, i) => (
          <g key={i} transform={`translate(${bx}, 38)`}>
            <ellipse cx="0" cy="-9.5" rx="2.8" ry="7.8" fill="rgba(201,168,71,1)"/>
            <ellipse cx="-5.5" cy="-5.5" rx="2.2" ry="5.5" fill="rgba(45,120,112,1)" transform="rotate(-22)"/>
            <ellipse cx="5.5"  cy="-5.5" rx="2.2" ry="5.5" fill="rgba(45,120,112,1)" transform="rotate(22)"/>
          </g>
        ))}
        {[300, 460, 620, 790, 948, 1108].map((bx, i) => (
          <g key={i} transform={`translate(${bx}, 39)`}>
            <ellipse cx="-6.5" cy="-3.2" rx="2.2" ry="6.5" fill="rgba(45,120,112,1)" transform="rotate(-35)"/>
            <ellipse cx="6.5"  cy="-3.2" rx="2.2" ry="6.5" fill="rgba(45,120,112,1)" transform="rotate(35)"/>
          </g>
        ))}
      </g>

      {/* ═══════════════════════════════════════════════
          IV. LEFT BORDER RUNNER
         ═══════════════════════════════════════════════ */}
      <g opacity="0.14">
        <path d="M38 138 C30 224 44 314 32 404 C20 494 42 574 30 664 C18 754 40 822 38 834"
          stroke="rgba(45,120,112,1)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        {[224, 348, 472, 596, 720, 820].map((by, i) => (
          <g key={i} transform={`translate(36, ${by})`}>
            <ellipse cx="9.5" cy="0" rx="7.8" ry="2.8" fill="rgba(45,120,112,1)"/>
            <ellipse cx="5.5" cy="-5.5" rx="5.5" ry="2.2" fill="rgba(201,168,71,1)" transform="rotate(-20)"/>
            <ellipse cx="5.5" cy="5.5"  rx="5.5" ry="2.2" fill="rgba(201,168,71,1)" transform="rotate(20)"/>
          </g>
        ))}
      </g>

      {/* ═══════════════════════════════════════════════
          V. RIGHT BORDER RUNNER
         ═══════════════════════════════════════════════ */}
      <g opacity="0.13">
        <path d="M1402 138 C1410 224 1396 314 1408 404 C1420 494 1398 574 1410 664 C1422 754 1400 822 1402 834"
          stroke="rgba(200,122,88,1)" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        {[240, 364, 488, 612, 736, 828].map((by, i) => (
          <g key={i} transform={`translate(1404, ${by})`}>
            <ellipse cx="-9.5" cy="0" rx="7.8" ry="2.8" fill="rgba(200,122,88,1)"/>
            <ellipse cx="-5.5" cy="-5.5" rx="5.5" ry="2.2" fill="rgba(201,168,71,1)" transform="rotate(20)"/>
            <ellipse cx="-5.5" cy="5.5"  rx="5.5" ry="2.2" fill="rgba(201,168,71,1)" transform="rotate(-20)"/>
          </g>
        ))}
      </g>

      {/* ═══════════════════════════════════════════════
          VI. BOTTOM BORDER RUNNER
         ═══════════════════════════════════════════════ */}
      <g opacity="0.13">
        <path d="M138 862 C300 854 448 868 596 858 C744 848 884 866 1024 856 C1124 846 1244 862 1302 858"
          stroke="rgba(45,120,112,1)" strokeWidth="0.95" fill="none" strokeLinecap="round"/>
        {[290, 490, 690, 890, 1090].map((bx, i) => (
          <g key={i} transform={`translate(${bx}, 860)`}>
            <ellipse cx="0" cy="9.5" rx="2.2" ry="6.8" fill="rgba(45,120,112,1)"/>
            <ellipse cx="-5.5" cy="5.5" rx="2.2" ry="4.5" fill="rgba(201,168,71,1)" transform="rotate(22)"/>
            <ellipse cx="5.5"  cy="5.5" rx="2.2" ry="4.5" fill="rgba(201,168,71,1)" transform="rotate(-22)"/>
          </g>
        ))}
      </g>

      {/* ═══════════════════════════════════════════════
          VII. PORTRAIT NIMBUS — halo framing the right figure
          Centered where the portrait presides (~x=820, y=410)
         ═══════════════════════════════════════════════ */}
      <g transform="translate(820, 400)" opacity="0.11">
        <circle r="200" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.85"/>
        <circle r="182" fill="none" stroke="rgba(201,168,71,1)" strokeWidth="0.35"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
          <ellipse key={a} cx="0" cy="-193" rx="4.2" ry="9.5" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-173" rx="3" ry="7" fill="rgba(45,120,112,1)" transform={`rotate(${a})`}/>
        ))}
        {[15,75,135,195,255,315].map(a => (
          <circle key={a}
            cx={Math.round(200 * Math.sin(a * Math.PI / 180))}
            cy={Math.round(-200 * Math.cos(a * Math.PI / 180))}
            r="2.5" fill="rgba(201,168,71,0.6)"/>
        ))}
      </g>

      {/* ═══════════════════════════════════════════════
          VIII. FEATURED FLORALS — placed on the compositional grid
         ═══════════════════════════════════════════════ */}

      {/* Rose — upper-left quadrant, between corner and arch */}
      <g transform="translate(350, 188)" opacity="0.16">
        {[0,36,72,108,144,180,216,252,288,324].map(a => (
          <ellipse key={a} cx="0" cy="-27" rx="6.5" ry="17.5" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="8"   fill="rgba(201,168,71,1)"/>
        <circle r="3.8" fill="rgba(6,14,12,1)"/>
      </g>

      {/* Coral lily — upper-right, between arch and corner */}
      <g transform="translate(1090, 188)" opacity="0.16">
        {[0,60,120,180,240,300].map(a => (
          <ellipse key={a} cx="0" cy="-23" rx="5.8" ry="15.5" fill="rgba(200,122,88,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="7"   fill="rgba(201,168,71,1)"/>
        <circle r="3.2" fill="rgba(6,14,12,1)"/>
      </g>

      {/* Teal poppy — lower left, anchoring bottom-left zone */}
      <g transform="translate(268, 648)" opacity="0.14">
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-22" rx="5.5" ry="15.5" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="6.5" fill="rgba(45,120,112,1)"/>
        <circle r="3"   fill="rgba(6,14,12,1)"/>
      </g>

      {/* Peony — right-centre, near portrait zone */}
      <g transform="translate(968, 295)" opacity="0.14">
        {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
          <ellipse key={a} cx="0" cy="-19" rx="5.5" ry="12.5" fill="rgba(200,122,88,1)" transform={`rotate(${a})`}/>
        ))}
        {[0,45,90,135,180,225,270,315].map(a => (
          <ellipse key={a} cx="0" cy="-10.5" rx="3.2" ry="7.5" fill="rgba(154,56,85,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="5.5" fill="rgba(201,168,71,1)"/>
        <circle r="2.5" fill="rgba(6,14,12,1)"/>
      </g>

      {/* Small teal star — mid-bottom breathing accent */}
      <g transform="translate(620, 760)" opacity="0.10">
        {[0,72,144,216,288].map(a => (
          <ellipse key={a} cx="0" cy="-19" rx="5.2" ry="13.5" fill="rgba(201,168,71,1)" transform={`rotate(${a})`}/>
        ))}
        <circle r="5.5" fill="rgba(200,122,88,1)"/>
        <circle r="2.5" fill="rgba(6,14,12,1)"/>
      </g>

      {/* ═══════════════════════════════════════════════
          IX. VINE TENDRILS — coherent botanical connections
         ═══════════════════════════════════════════════ */}
      <g opacity="0.10" fill="none" strokeLinecap="round">
        {/* Arch left foot → upper-left corner */}
        <path d="M482 0 C390 62 264 106 138 136" stroke="rgba(201,168,71,1)" strokeWidth="1.0"/>
        {/* Arch right foot → upper-right corner */}
        <path d="M998 0 C1090 62 1216 106 1302 136" stroke="rgba(201,168,71,1)" strokeWidth="1.0"/>
        {/* Upper-left rose ↓ lower-left poppy */}
        <path d="M350 188 C328 348 298 498 268 648" stroke="rgba(45,120,112,1)" strokeWidth="0.75"/>
        {/* Upper-right lily → peony */}
        <path d="M1090 188 C1052 226 1010 258 968 295" stroke="rgba(200,122,88,1)" strokeWidth="0.72"/>
        {/* Peony → nimbus area */}
        <path d="M968 295 C988 330 1010 360 820 400" stroke="rgba(200,122,88,0.6)" strokeWidth="0.65"/>
        {/* Left border mid-accent ↓ poppy */}
        <path d="M36 472 C80 510 160 560 268 648" stroke="rgba(45,120,112,0.7)" strokeWidth="0.6"/>

        {/* Curlicue — at rose */}
        <path d="M400 190 C412 182 418 170 410 162 C402 154 392 162 396 170 C400 178 414 178 412 170"
          stroke="rgba(154,56,85,1)" strokeWidth="0.7"/>
        {/* Curlicue — at poppy */}
        <path d="M318 648 C330 640 336 628 328 620 C320 612 310 620 314 630 C318 640 332 638 330 630"
          stroke="rgba(45,120,112,1)" strokeWidth="0.65"/>
        {/* Curlicue — at peony */}
        <path d="M1018 298 C1030 290 1036 278 1028 270 C1020 262 1010 270 1014 280 C1018 290 1032 288 1030 280"
          stroke="rgba(200,122,88,1)" strokeWidth="0.65"/>
      </g>

      {/* ═══════════════════════════════════════════════
          X. CORNER FLOURISHES — diagonal spurs
         ═══════════════════════════════════════════════ */}
      <g opacity="0.11" stroke="rgba(201,168,71,1)" fill="none" strokeLinecap="round">
        <path d="M138 66 C157 96 172 130 158 164" strokeWidth="0.85"/>
        <path d="M66 138 C96 157 130 172 164 158" strokeWidth="0.85"/>
        <path d="M1302 66 C1283 96 1268 130 1282 164" strokeWidth="0.85"/>
        <path d="M1374 138 C1344 157 1310 172 1276 158" strokeWidth="0.85"/>
        <path d="M66 762 C96 743 130 728 164 742"  strokeWidth="0.7"/>
        <path d="M138 834 C157 804 172 770 158 736" strokeWidth="0.7"/>
        <path d="M1374 762 C1344 743 1310 728 1276 742" strokeWidth="0.7"/>
        <path d="M1302 834 C1283 804 1268 770 1282 736" strokeWidth="0.7"/>
      </g>

      {/* ═══════════════════════════════════════════════
          XI. INNER FRAME — a second precise border 28px inset
         ═══════════════════════════════════════════════ */}
      <g opacity="0.06" stroke="rgba(201,168,71,1)" fill="none">
        <rect x="28" y="28" width="1384" height="844" strokeWidth="0.5" rx="1"/>
        <rect x="20" y="20" width="1400" height="860" strokeWidth="0.3" rx="1"/>
      </g>
    </svg>
  )
})

export default function Home() {
  const pageRef = useRef(null)
  const rafRef  = useRef(null)
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)

  const handleMouseMove = useCallback((e) => {
    if (isTouch || !pageRef.current || rafRef.current) return
    const cx = e.clientX
    const cy = e.clientY
    rafRef.current = requestAnimationFrame(() => {
      if (pageRef.current) {
        const rect = pageRef.current.getBoundingClientRect()
        mouseX.set(cx - rect.width / 2)
        mouseY.set(cy - rect.height / 2)
      }
      rafRef.current = null
    })
  }, [mouseX, mouseY])

  return (
    <div className="home-page" ref={pageRef} onMouseMove={handleMouseMove}>
      <div className="home-scene">
        <ArtNouveauOverlay />
        <ParallaxScene mouseX={mouseX} mouseY={mouseY} />
        <div className="home-gradient-floor" />
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

      <div className="home-ticker">
        <Ticker />
      </div>
    </div>
  )
}
