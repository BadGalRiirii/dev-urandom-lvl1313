import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import './WisteriaScene.css'

const COUNT    = window.innerWidth < 768 ? 28 : 55   // phones get half the petals
const REPEL_R  = 2.4
const REPEL_R2 = REPEL_R * REPEL_R
const REPEL_S  = 10
const SPRING_K = 10
const SPRING_B = 5
const _dummy   = new THREE.Object3D()

const PALETTE = [
  new THREE.Color('#7c3aed'),
  new THREE.Color('#8b5cf6'),
  new THREE.Color('#9333ea'),
  new THREE.Color('#a855f7'),
  new THREE.Color('#c084fc'),
  new THREE.Color('#d8b4fe'),
  new THREE.Color('#e879f9'),
]

function rand(lo, hi) { return lo + Math.random() * (hi - lo) }

function makePetalTex() {
  const s   = 64
  const cv  = document.createElement('canvas')
  cv.width  = cv.height = s
  const ctx = cv.getContext('2d')
  const cx  = s / 2, cy = s / 2
  const g   = ctx.createRadialGradient(cx, cy * 0.65, 0, cx, cy, s * 0.48)
  g.addColorStop(0.00, 'rgba(255,255,255,1.00)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.78, 'rgba(255,255,255,0.55)')
  g.addColorStop(1.00, 'rgba(255,255,255,0.00)')
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(0.64, 1.0)
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  return new THREE.CanvasTexture(cv)
}

// 3 planes at 0°/60°/120° around Y merged into one geometry — looks 3D when tumbling
function createFloretGeo() {
  const W = 0.78, H = 1.12
  const pos = new Float32Array(36)
  const nor = new Float32Array(36)
  const uv  = new Float32Array(24)
  const idx = []
  const lv  = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]]

  for (let p = 0; p < 3; p++) {
    const θ   = (p / 3) * Math.PI
    const cos = Math.cos(θ)
    const sin = Math.sin(θ)

    for (let v = 0; v < 4; v++) {
      const [lx, ly] = lv[v]
      const i3 = (p * 4 + v) * 3
      const i2 = (p * 4 + v) * 2
      // Y-rotation: pos = (lx·cos, ly, −lx·sin), normal = (sin, 0, cos)
      pos[i3] = lx * cos; pos[i3 + 1] = ly; pos[i3 + 2] = -lx * sin
      nor[i3] = sin;       nor[i3 + 1] = 0;  nor[i3 + 2] = cos
      uv[i2]  = (lx + W / 2) / W
      uv[i2 + 1] = (ly + H / 2) / H
    }

    const b = p * 4
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('normal',   new THREE.BufferAttribute(nor, 3))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uv, 2))
  geo.setIndex(idx)
  return geo
}

function makePetal() {
  return {
    x: rand(-10, 10), y: rand(-14, 10), z: rand(0.4, 4.8),
    sc:  rand(0.52, 1.45),
    vy:  rand(0.20, 0.65),
    swA: rand(0.4, 1.9) * (Math.random() < 0.5 ? 1 : -1),
    swF: rand(0.12, 0.42),
    swP: rand(0, Math.PI * 2),
    rx:  rand(0, Math.PI * 2),
    ry:  rand(0, Math.PI * 2),
    rz:  rand(0, Math.PI * 2),
    vrx: rand(-0.50, 0.50),
    vry: rand(-0.42, 0.42),
    vrz: rand(-0.35, 0.35),
    ci:  Math.floor(Math.random() * PALETTE.length),
    ox: 0, oy: 0, ovx: 0, ovy: 0,
  }
}

function PetalField({ mouse }) {
  const mesh = useRef()

  const { geo, mat } = useMemo(() => ({
    geo: createFloretGeo(),
    mat: new THREE.MeshLambertMaterial({
      map:         makePetalTex(),
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
      color:       new THREE.Color(1, 1, 1),
    }),
  }), [])

  const petals = useRef(Array.from({ length: COUNT }, makePetal))

  useEffect(() => {
    const m = mesh.current
    if (!m) return
    petals.current.forEach((p, i) => m.setColorAt(i, PALETTE[p.ci]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  useFrame(({ clock }, delta) => {
    const m = mesh.current
    if (!m) return
    const t  = clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const mx = mouse.current.x
    const my = mouse.current.y

    for (let i = 0; i < COUNT; i++) {
      const p = petals.current[i]

      p.y -= p.vy * dt
      if (p.y < -13) {
        p.y = 11 + rand(0, 3)
        p.x = rand(-10, 10)
        p.ox = p.oy = p.ovx = p.ovy = 0
      }

      p.rx += p.vrx * dt
      p.ry += p.vry * dt
      p.rz += p.vrz * dt

      const sway = Math.sin(t * p.swF + p.swP) * p.swA
      const wx   = p.x + sway + p.ox
      const wy   = p.y + p.oy

      const dx = wx - mx, dy = wy - my
      const d2 = dx * dx + dy * dy
      if (d2 < REPEL_R2 && d2 > 0.0001) {
        const d = Math.sqrt(d2)
        const f = (1 - d / REPEL_R) * REPEL_S
        p.ovx += (dx / d) * f * dt
        p.ovy += (dy / d) * f * dt
      }

      p.ovx += (-p.ox * SPRING_K - p.ovx * SPRING_B) * dt
      p.ovy += (-p.oy * SPRING_K - p.ovy * SPRING_B) * dt
      p.ox  += p.ovx * dt
      p.oy  += p.ovy * dt

      _dummy.position.set(p.x + sway + p.ox, p.y + p.oy, p.z)
      _dummy.rotation.set(p.rx, p.ry, p.rz)
      _dummy.scale.setScalar(p.sc)
      _dummy.updateMatrix()
      m.setMatrixAt(i, _dummy.matrix)
    }

    m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, COUNT]} />
}

export default function WisteriaScene() {
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const H = Math.tan(35 * Math.PI / 180) * 7
    const toWorld = (cx, cy) => {
      const W = H * (window.innerWidth / window.innerHeight)
      mouse.current = {
        x:  (cx / window.innerWidth  - 0.5) * 2 * W,
        y: -(cy / window.innerHeight - 0.5) * 2 * H,
      }
    }
    const onMouse = e => toWorld(e.clientX, e.clientY)
    const onTouch = e => { if (e.touches[0]) toWorld(e.touches[0].clientX, e.touches[0].clientY) }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [])

  return (
    <div className="wisteria-canvas" aria-hidden="true">
      <Canvas
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 7], fov: 70, near: 0.01, far: 60 }}
        dpr={1}
        flat
      >
        <ambientLight     intensity={2.0} color="#ede0ff" />
        <directionalLight position={[4, 8, 5]} intensity={2.5} color="#f5eeff" />
        <PetalField mouse={mouse} />
      </Canvas>
    </div>
  )
}
