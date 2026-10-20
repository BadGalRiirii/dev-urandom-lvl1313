import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './WisteriaScene.css'

const COUNT    = window.innerWidth < 768 ? 32 : 60   // phones get fewer petals
const CAM_Z    = 7
const HALF_FOV = Math.tan((70 / 2) * Math.PI / 180)  // visible half-height per unit of distance
const Z_NEAR   = 3      // closest petals sit 4 units from the camera…
const Z_FAR    = -4     // …farthest 11, so near ones read bigger and faster without blowing up
const REPEL_R  = 1.6
const REPEL_R2 = REPEL_R * REPEL_R
const REPEL_S  = 9
const SPRING_K = 10
const SPRING_B = 5
const _dummy   = new THREE.Object3D()

const PALETTE = [
  '#8f6fd8', '#9b7be0', '#a183e6', '#b49af0',
  '#c6b2f7', '#d8cafb', '#c9a6f2', '#e2c8f7',
].map(c => new THREE.Color(c))

function rand(lo, hi) { return lo + Math.random() * (hi - lo) }

// A single wisteria petal: rounded, notched tip, narrow base, fine veins.
// Drawn near-white so each instance can be tinted its own shade of lilac.
function makePetalTex(anisotropy) {
  const s   = 256
  const cv  = document.createElement('canvas')
  cv.width  = cv.height = s
  const ctx = cv.getContext('2d')

  const petal = new Path2D()
  petal.moveTo(s * 0.50, s * 0.97)
  petal.bezierCurveTo(s * 0.12, s * 0.80, s * 0.02, s * 0.34, s * 0.28, s * 0.12)
  petal.quadraticCurveTo(s * 0.42, s * 0.02, s * 0.50, s * 0.11)
  petal.quadraticCurveTo(s * 0.58, s * 0.02, s * 0.72, s * 0.12)
  petal.bezierCurveTo(s * 0.98, s * 0.34, s * 0.88, s * 0.80, s * 0.50, s * 0.97)
  petal.closePath()

  // Deeper at the base, pale toward the tip
  const body = ctx.createLinearGradient(0, s, 0, 0)
  body.addColorStop(0.00, 'rgb(150,140,175)')
  body.addColorStop(0.35, 'rgb(225,220,240)')
  body.addColorStop(1.00, 'rgb(255,255,255)')
  ctx.fillStyle = body
  ctx.fill(petal)

  ctx.save()
  ctx.clip(petal)
  const sheen = ctx.createRadialGradient(s * 0.42, s * 0.42, 0, s * 0.42, s * 0.42, s * 0.45)
  sheen.addColorStop(0, 'rgba(255,255,255,0.55)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, s, s)

  ctx.strokeStyle = 'rgba(90,70,130,0.18)'
  ctx.lineWidth = 1.4
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath()
    ctx.moveTo(s * 0.5, s * 0.95)
    ctx.quadraticCurveTo(s * (0.5 + i * 0.05), s * 0.55, s * (0.5 + i * 0.085), s * 0.16)
    ctx.stroke()
  }
  ctx.restore()

  // Thin rim so the silhouette stays crisp at small sizes
  ctx.strokeStyle = 'rgba(80,60,120,0.35)'
  ctx.lineWidth = 2
  ctx.stroke(petal)

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  return tex
}

// Slightly cupped across the width and curled toward the tip, so the lighting
// shifts across the surface as it turns — reads as a real petal, not a card.
function createPetalGeo() {
  const geo = new THREE.PlaneGeometry(0.8, 1, 6, 8)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i) + 0.5
    pos.setZ(i, x * x * 0.9 + y * y * 0.18)
  }
  geo.computeVertexNormals()
  return geo
}

const halfHeightAt = (z) => HALF_FOV * (CAM_Z - z)

function spawn(p, aspect, anywhere) {
  p.z = rand(Z_FAR, Z_NEAR)
  const hh = halfHeightAt(p.z)
  const hw = hh * aspect
  p.x = rand(-hw, hw) * 1.1
  p.y = anywhere ? rand(-hh, hh) : hh + rand(0.6, 2.2)
  p.ox = p.oy = p.ovx = p.ovy = 0
}

function makePetal(aspect) {
  const p = {
    sc:   rand(0.38, 0.62),
    vy:   rand(0.35, 0.70),
    swA:  rand(0.25, 0.70),          // side-to-side swing (world units)
    swF:  rand(0.60, 1.30),          // swing speed (rad/s)
    swP:  rand(0, Math.PI * 2),
    rock: rand(0.35, 0.80),          // tilt into each swing
    tum:  rand(0.40, 1.10),          // forward/back tumble
    spin: rand(-0.8, 0.8),           // slow turn around its length
    ry:   rand(0, Math.PI * 2),
    ci:   Math.floor(Math.random() * PALETTE.length),
  }
  spawn(p, aspect, true)
  return p
}

function PetalField({ mouse }) {
  const mesh = useRef()
  const gl   = useThree(s => s.gl)

  const { geo, mat } = useMemo(() => ({
    geo: createPetalGeo(),
    mat: new THREE.MeshLambertMaterial({
      map:         makePetalTex(Math.min(8, gl.capabilities.getMaxAnisotropy())),
      transparent: true,
      alphaTest:   0.01,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    }),
  }), [gl])

  const petals = useRef(null)
  if (petals.current == null) {
    const aspect = window.innerWidth / window.innerHeight
    petals.current = Array.from({ length: COUNT }, () => makePetal(aspect))
  }

  useEffect(() => {
    const m = mesh.current
    petals.current.forEach((p, i) => m.setColorAt(i, PALETTE[p.ci]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    return () => {
      geo.dispose()
      mat.map.dispose()
      mat.dispose()
    }
  }, [geo, mat])

  useFrame(({ clock, size }, delta) => {
    const m = mesh.current
    if (!m) return
    const t      = clock.elapsedTime
    const dt     = Math.min(delta, 0.05)
    const aspect = size.width / size.height
    const wind   = 0.12 + Math.sin(t * 0.13) * 0.10

    for (let i = 0; i < COUNT; i++) {
      const p  = petals.current[i]
      const ph = t * p.swF + p.swP

      // Falls a little slower at the ends of each swing, like a real petal
      p.y  -= p.vy * dt * (1 + 0.25 * Math.cos(ph * 2))
      p.x  += wind * dt
      p.ry += p.spin * dt

      const hh = halfHeightAt(p.z)
      const hw = hh * aspect
      if (p.y < -hh - 1) spawn(p, aspect, false)
      if (p.x > hw + 1.5) p.x -= 2 * (hw + 1.5)
      else if (p.x < -hw - 1.5) p.x += 2 * (hw + 1.5)

      const sway = Math.sin(ph) * p.swA
      const wx   = p.x + sway + p.ox
      const wy   = p.y + p.oy

      // Cursor pushes petals aside, measured in this petal's own depth plane
      const dx = wx - mouse.current.x * hw
      const dy = wy - mouse.current.y * hh
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
      _dummy.rotation.set(Math.sin(ph * 0.5) * p.tum, p.ry, -Math.cos(ph) * p.rock)
      _dummy.scale.setScalar(p.sc)
      _dummy.updateMatrix()
      m.setMatrixAt(i, _dummy.matrix)
    }

    m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false} />
}

export default function WisteriaScene() {
  // Cursor in normalised screen coords (-1..1); starts off-screen so nothing is pushed
  const mouse = useRef({ x: 99, y: 99 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const toNdc = (cx, cy) => {
      mouse.current = {
        x:  (cx / window.innerWidth)  * 2 - 1,
        y: -(cy / window.innerHeight) * 2 + 1,
      }
    }
    const onMouse = e => toNdc(e.clientX, e.clientY)
    const onTouch = e => { if (e.touches[0]) toNdc(e.touches[0].clientX, e.touches[0].clientY) }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [])

  return (
    <div className={`wisteria-canvas${ready ? ' is-ready' : ''}`} aria-hidden="true">
      <Canvas
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, CAM_Z], fov: 70, near: 0.1, far: 30 }}
        dpr={[1, 2]}
        flat
        onCreated={() => setReady(true)}
      >
        <ambientLight     intensity={1.7} color="#efe6ff" />
        <directionalLight position={[3, 8, 6]} intensity={2.2} color="#fbf6ff" />
        <PetalField mouse={mouse} />
      </Canvas>
    </div>
  )
}
