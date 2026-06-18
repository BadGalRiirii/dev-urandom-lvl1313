import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import { useNavigate, useLocation } from 'react-router-dom'
import './ModelNav.css'

const NAV = [
  { label: 'Home',    to: '/',        num: 'I'   },
  { label: 'Library', to: '/library', num: 'II'  },
  { label: 'Journal', to: '/journal', num: 'III' },
  { label: 'Music',   to: '/music',   num: 'IV'  },
]

function Model() {
  const { scene } = useGLTF('/models/base_basic_shaded.glb')
  return <primitive object={scene} scale={11.2} position={[0, -10.8, 0]} dispose={null} />
}

/* Fine-tunes FOV per breakpoint while keeping camera at same z distance.
   Mobile portrait is taller than wide, so vertical coverage is already good
   at z=14 — no need to pull way back. */
function CameraRig({ orbitRef }) {
  const { camera, size, gl } = useThree()

  useEffect(() => {
    const w = size.width

    if (w < 480) {
      camera.position.set(0, 6.2, 20)
      camera.fov = 70
    } else if (w < 768) {
      camera.position.set(0, 6.2, 17)
      camera.fov = 68
    } else if (w < 1024) {
      camera.position.set(0, 6.2, 15)
      camera.fov = 66
    } else {
      camera.position.set(0, 6.2, 15)
      camera.fov = 66
    }

    camera.updateProjectionMatrix()

    // OrbitControls sets touch-action: none inline on the canvas, blocking ALL mobile scroll.
    // Override it here (runs after OrbitControls mounts) so vertical scroll passes through.
    gl.domElement.style.touchAction = w < 768 ? 'pan-y' : ''

    if (orbitRef.current) {
      orbitRef.current.object = camera
      orbitRef.current.update()
    }
  }, [camera, size.width, orbitRef, gl])

  return null
}

useGLTF.preload('/models/base_basic_shaded.glb')

export default function ModelNav() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const orbitRef   = useRef()

  return (
    <div className="model-nav-root">

      <div className="model-nav-halo" />

      <div className="model-canvas-bg">
        <div className="model-bottom-fade" aria-hidden="true" />
        <Canvas
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [0, 6.2, 15], fov: 66, near: 0.1, far: 100 }}
          dpr={[1, 1.5]}
          performance={{ min: 0.5 }}
        >
          <CameraRig orbitRef={orbitRef} />

          <ambientLight intensity={0.10} />
          <directionalLight position={[4, 14, 6]} intensity={3.2} color="#f9edd0" />
          <pointLight position={[-10, 6, 4]} color="#1d6e68" intensity={4.5} distance={35} />
          <pointLight position={[5, 8, -8]}  color="#7a1a38" intensity={2.6} distance={30} />

          <Suspense fallback={null}>
            <Model />
          </Suspense>

          <OrbitControls
            ref={orbitRef}
            autoRotate
            autoRotateSpeed={1.2}
            enableZoom={false}
            enablePan={false}
            target={[0, 2.2, 0]}
            minPolarAngle={Math.PI / 3.2}
            maxPolarAngle={(Math.PI * 2.2) / 3.5}
          />
        </Canvas>
      </div>

      <div className="mnav-line-v" aria-hidden="true" />
      <div className="mnav-line-h" aria-hidden="true" />
      <div className="mnav-center"  aria-hidden="true" />

      <div className="mnav-corner tl" aria-hidden="true" />
      <div className="mnav-corner tr" aria-hidden="true" />
      <div className="mnav-corner bl" aria-hidden="true" />
      <div className="mnav-corner br" aria-hidden="true" />

      <nav className="model-nav-labels">
        {NAV.map(({ label, to, num }, i) => (
          <button
            key={to}
            className={`mnav-pill pos-${i}${location.pathname === to ? ' active' : ''}`}
            onClick={() => location.pathname === to ? window.location.reload() : navigate(to)}
          >
            <span className="mnav-pill-top" aria-hidden="true">
              <span className="mnav-pip">✦</span>
            </span>
            <span className="mnav-label">{label}</span>
            <span className="mnav-pill-bot" aria-hidden="true">
              <span className="mnav-num">{num}</span>
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
