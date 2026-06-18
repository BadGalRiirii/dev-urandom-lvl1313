import { Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import './WisteriaScene.css'

const COUNT_A = 52   // wisteria-flower-3D — small florets
const COUNT_B = 28   // WISTERIA-wo-stem-3D — fuller clusters
const _dummy  = new THREE.Object3D()

function rand(lo, hi) { return lo + Math.random() * (hi - lo) }

/* Extract first mesh geometry from a GLTF scene, normalize to 1-unit cube */
function buildGeo(scene) {
  let geo = null
  scene.traverse(node => {
    if (geo || !node.isMesh || !node.geometry) return
    geo = node.geometry.clone()
    node.updateWorldMatrix(true, false)
    geo.applyMatrix4(node.matrixWorld)
  })
  if (!geo) return null
  geo.computeBoundingBox()
  geo.center()
  const size = new THREE.Vector3()
  geo.boundingBox.getSize(size)
  const m = Math.max(size.x, size.y, size.z) || 1
  geo.scale(1 / m, 1 / m, 1 / m)
  return geo
}

function makePetal() {
  return {
    x:   rand(-10, 10),
    y:   rand(-14, 10),       // scatter across full screen at start
    z:   rand(0.5, 4.0),      // depth — creates natural parallax
    sc:  rand(0.28, 0.82),    // scale in world units (after normalisation)
    vy:  rand(0.28, 0.72),    // fall speed
    swA: rand(0.6, 2.2) * (Math.random() < 0.5 ? 1 : -1), // sway amplitude
    swF: rand(0.18, 0.55),    // sway frequency
    swP: rand(0, Math.PI * 2),
    rx:  rand(0, Math.PI * 2),
    ry:  rand(0, Math.PI * 2),
    rz:  rand(0, Math.PI * 2),
    vrx: rand(-0.55, 0.55),   // angular velocities — tumbling
    vry: rand(-0.45, 0.45),
    vrz: rand(-0.38, 0.38),
  }
}

function PetalField({ target }) {
  const { scene: sA } = useGLTF('/models/wisteria-flower-3D.glb')
  const { scene: sB } = useGLTF('/models/WISTERIA-wo-stem-3D.glb')

  const refA = useRef()
  const refB = useRef()

  const { geoA, geoB, matA, matB } = useMemo(() => {
    const gA = buildGeo(sA)
    const gB = buildGeo(sB)

    // Deep violet — primary florets
    const mA = new THREE.MeshStandardMaterial({
      color:             new THREE.Color('#7c3aed'),
      emissive:          new THREE.Color('#2e1065'),
      emissiveIntensity: 0.45,
      roughness:         0.50,
      metalness:         0.08,
      transparent:       true,
      opacity:           0.78,
      side:              THREE.DoubleSide,
    })

    // Soft lavender — accent clusters
    const mB = new THREE.MeshStandardMaterial({
      color:             new THREE.Color('#c084fc'),
      emissive:          new THREE.Color('#4c1d95'),
      emissiveIntensity: 0.30,
      roughness:         0.62,
      metalness:         0.04,
      transparent:       true,
      opacity:           0.65,
      side:              THREE.DoubleSide,
    })

    return { geoA: gA, geoB: gB, matA: mA, matB: mB }
  }, [sA, sB])

  const petalsA = useRef(Array.from({ length: COUNT_A }, makePetal))
  const petalsB = useRef(Array.from({ length: COUNT_B }, makePetal))
  const mouse   = useRef({ x: 0, y: 0 })

  useFrame(({ clock }, delta) => {
    const t  = clock.elapsedTime
    const dt = Math.min(delta, 0.05)

    mouse.current.x += (target.current.x - mouse.current.x) * 0.06
    mouse.current.y += (target.current.y - mouse.current.y) * 0.06
    const mx = mouse.current.x
    const my = mouse.current.y

    const animate = (petals, ref, count) => {
      if (!ref.current) return
      for (let i = 0; i < count; i++) {
        const p = petals[i]

        p.y -= p.vy * dt
        if (p.y < -13) {
          p.y = 11 + Math.random() * 2
          p.x = rand(-10, 10)
        }

        p.rx += p.vrx * dt
        p.ry += p.vry * dt
        p.rz += p.vrz * dt

        const sway = Math.sin(t * p.swF + p.swP) * p.swA

        // Depth-scaled mouse parallax — deeper petals move more
        _dummy.position.set(
          p.x + sway + mx * p.z * 0.52,
          p.y        - my * p.z * 0.24,
          p.z,
        )
        _dummy.rotation.set(p.rx, p.ry, p.rz)
        _dummy.scale.setScalar(p.sc)
        _dummy.updateMatrix()
        ref.current.setMatrixAt(i, _dummy.matrix)
      }
      ref.current.instanceMatrix.needsUpdate = true
    }

    animate(petalsA.current, refA, COUNT_A)
    animate(petalsB.current, refB, COUNT_B)
  })

  return (
    <>
      {geoA && <instancedMesh ref={refA} args={[geoA, matA, COUNT_A]} />}
      {geoB && <instancedMesh ref={refB} args={[geoB, matB, COUNT_B]} />}
    </>
  )
}

useGLTF.preload('/models/wisteria-flower-3D.glb')
useGLTF.preload('/models/WISTERIA-wo-stem-3D.glb')

export default function WisteriaScene() {
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMouse = (e) => {
      target.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }
    const onTouch = (e) => {
      const t = e.touches[0]
      if (!t) return
      target.current = {
        x: (t.clientX / window.innerWidth  - 0.5) * 2,
        y: (t.clientY / window.innerHeight - 0.5) * 2,
      }
    }
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
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 8], fov: 70, near: 0.01, far: 60 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        {/* Atmospheric purple lighting */}
        <ambientLight     intensity={1.5} color="#ede0ff" />
        <directionalLight position={[3, 10, 6]}  intensity={3.0} color="#f8f0ff" />
        <pointLight       position={[-5, 4, 5]}  intensity={5.5} color="#a855f7" distance={22} />
        <pointLight       position={[4, -3, 4]}  intensity={2.8} color="#7c3aed" distance={16} />
        <pointLight       position={[0, 6, 2]}   intensity={1.8} color="#e879f9" distance={14} />
        <Suspense fallback={null}>
          <PetalField target={target} />
        </Suspense>
      </Canvas>
    </div>
  )
}
