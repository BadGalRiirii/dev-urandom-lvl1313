import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react'
import waterlily from '../../assets/waterlily.webp'
import './LilypodBg.css'

// Water ripples on the GPU (WebGL2). The wave simulation runs on a coarse grid,
// but the photo is drawn at full device resolution and the ripple field is
// smoothly interpolated across it — so the image stays sharp while it warps.

const GRID_SCALE = 0.55   // wave grid cells per CSS px — sets ripple size & speed
const DAMP       = 0.968  // wave decay — ripples fade in ~1s
const DISPLACE   = 0.20   // refraction strength — subtle, doesn't over-warp
const SPLASH_STRENGTH = 170
const SPLASH_RADIUS   = 5     // in grid cells
const MAX_SPLASHES    = 8     // applied per step; extras wait for the next step
const STEP      = 1 / 60      // waves advance 60 steps/s on any refresh rate
const SETTLE_MS = 4000        // water is flat again by then, so drawing stops
const IMAGE_FILTER = 'brightness(0.86) saturate(1.40) contrast(1.12) hue-rotate(6deg)'

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

// One step of the 2-D wave equation. r = current height, g = previous height.
const STEP_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec4 uSplash[${MAX_SPLASHES}];   // xy = cell, z = strength, w = radius
uniform int uSplashCount;
uniform float uDamp;
out vec4 outState;
void main() {
  ivec2 p    = ivec2(gl_FragCoord.xy);
  ivec2 size = textureSize(uState, 0);
  if (p.x == 0 || p.y == 0 || p.x == size.x - 1 || p.y == size.y - 1) {
    outState = vec4(0.0);   // edges stay flat
    return;
  }
  vec2 s = texelFetch(uState, p, 0).rg;
  float prev = s.g;
  for (int i = 0; i < ${MAX_SPLASHES}; i++) {
    if (i >= uSplashCount) break;
    vec2 d = vec2(p) - uSplash[i].xy;
    if (dot(d, d) <= uSplash[i].w * uSplash[i].w) prev = uSplash[i].z;
  }
  float n = texelFetch(uState, p + ivec2(1, 0), 0).r + texelFetch(uState, p - ivec2(1, 0), 0).r
          + texelFetch(uState, p + ivec2(0, 1), 0).r + texelFetch(uState, p - ivec2(0, 1), 0).r;
  outState = vec4((n * 0.5 - prev) * uDamp, s.r, 0.0, 1.0);
}`

// Shift each pixel of the photo along the slope of the water surface.
const SHOW_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uState;
uniform vec2 uTexel;      // size of one grid cell in uv
uniform float uDisplace;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 dx = vec2(uTexel.x, 0.0), dy = vec2(0.0, uTexel.y);
  vec2 slope = vec2(
    texture(uState, vUv + dx).r - texture(uState, vUv - dx).r,
    texture(uState, vUv + dy).r - texture(uState, vUv - dy).r
  );
  vec2 uv = clamp(vUv + slope * uDisplace * uTexel, 0.0, 1.0);
  outColor = vec4(texture(uImage, uv).rgb, 1.0);
}`

// Draws the photo cover-fitted and colour-graded at exactly w×h pixels
function paintImage(ctx, img, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * scale
  const dh = img.naturalHeight * scale
  ctx.filter = IMAGE_FILTER
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

const deviceSize = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  return [Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr)]
}

function compile(gl, frag) {
  const prog = gl.createProgram()
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, frag]]) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
    gl.attachShader(prog, sh)
    gl.deleteShader(sh)
  }
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  const u = (name) => gl.getUniformLocation(prog, name)
  return { prog, u }
}

function texture(gl, setup) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  setup()
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

// Wave state texture + framebuffer to render the next step into
function waveTarget(gl, w, h) {
  const tex = texture(gl, () =>
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, w, h, 0, gl.RG, gl.HALF_FLOAT, null))
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { tex, fb, ok }
}

// No WebGL2 at all: just show the photo, sharp and still
function createStill(canvas, img) {
  const paint = () => {
    const [w, h] = deviceSize()
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) paintImage(ctx, img, w, h)
  }
  paint()
  return { splash() {}, resize: paint, dispose() {} }
}

function createWater(canvas, img) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false })
  if (!gl) return createStill(canvas, img)

  const floatTargets = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'))
  const splashData = new Float32Array(MAX_SPLASHES * 4)

  let res = null          // GL objects — rebuilt if the context is lost
  let canRipple = floatTargets
  let grid = [1, 1]
  let read = 0            // which of res.waves holds the current state
  let pending = []
  let raf = 0, last = 0, acc = 0, settleUntil = 0

  const freeWaves = () => {
    for (const w of res.waves) { gl.deleteTexture(w.tex); if (w.fb) gl.deleteFramebuffer(w.fb) }
    res.waves = []
  }
  // Everything that depends on the screen size
  const freeSized = () => {
    gl.deleteTexture(res.image)
    freeWaves()
  }

  const build = () => {
    const step = compile(gl, STEP_FRAG)
    const show = compile(gl, SHOW_FRAG)

    gl.useProgram(step.prog)
    gl.uniform1i(step.u('uState'), 0)
    gl.uniform1f(step.u('uDamp'), DAMP)
    gl.useProgram(show.prog)
    gl.uniform1i(show.u('uImage'), 0)
    gl.uniform1i(show.u('uState'), 1)
    gl.uniform1f(show.u('uDisplace'), DISPLACE)

    // One triangle that covers the whole screen
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    res = {
      step, show, vao, buf, image: null, waves: [],
      uSplash: step.u('uSplash'), uSplashCount: step.u('uSplashCount'), uTexel: show.u('uTexel'),
    }
  }

  const fit = () => {
    freeSized()
    const [w, h] = deviceSize()
    canvas.width = w
    canvas.height = h

    // Photo at exactly the screen's pixel size → 1:1 sampling, no upscale blur
    const off = document.createElement('canvas')
    off.width = w
    off.height = h
    paintImage(off.getContext('2d'), img, w, h)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    res.image = texture(gl, () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off))
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

    grid = [
      Math.max(3, Math.floor(window.innerWidth * GRID_SCALE)),
      Math.max(3, Math.floor(window.innerHeight * GRID_SCALE)),
    ]
    if (canRipple) {
      res.waves = [waveTarget(gl, ...grid), waveTarget(gl, ...grid)]
      if (!res.waves.every(t => t.ok)) { freeWaves(); canRipple = false }
    }
    if (!canRipple) {
      // GPU can't render float textures: flat water, photo still shows sharp
      res.waves = [{ tex: texture(gl, () =>
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))) }]
    }
    read = 0
    pending = []
  }

  const step = () => {
    const src = res.waves[read]
    const dst = res.waves[read ^ 1]
    const batch = pending.splice(0, MAX_SPLASHES)
    batch.forEach((s, i) => splashData.set(s, i * 4))

    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb)
    gl.viewport(0, 0, grid[0], grid[1])
    gl.useProgram(res.step.prog)
    gl.uniform4fv(res.uSplash, splashData)
    gl.uniform1i(res.uSplashCount, batch.length)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, src.tex)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    read ^= 1
  }

  const draw = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(res.show.prog)
    gl.uniform2f(res.uTexel, 1 / grid[0], 1 / grid[1])
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, res.image)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, res.waves[read].tex)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const frame = (now) => {
    raf = 0
    if (!res) return
    acc += Math.min((now - last) / 1000, 0.1)
    last = now
    // Round rather than floor: at 60Hz this gives a steady 1 step per frame
    // instead of jittering between 0 and 2, which is what reads as stutter
    const n = Math.min(4, Math.round(acc / STEP))
    acc -= n * STEP
    for (let i = 0; i < n; i++) step()
    if (n > 0) draw()
    if (now < settleUntil) raf = requestAnimationFrame(frame)
  }

  const wake = () => {
    settleUntil = performance.now() + SETTLE_MS
    if (!raf) {
      last = performance.now()
      acc = 0
      raf = requestAnimationFrame(frame)
    }
  }

  const onLost = (e) => {
    e.preventDefault()   // lets the browser restore the context later
    cancelAnimationFrame(raf)
    raf = 0
    res = null
  }
  const onRestored = () => { build(); fit(); draw() }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  build()
  fit()
  draw()

  return {
    splash(clientX, clientY) {
      if (!res || !canRipple) return
      // Grid y runs bottom-up in GL, screen y runs top-down
      const x = Math.floor((clientX / window.innerWidth) * grid[0])
      const y = Math.floor((1 - clientY / window.innerHeight) * grid[1])
      pending.push([x, y, SPLASH_STRENGTH, SPLASH_RADIUS])
      wake()
    },
    resize() {
      if (!res) return
      fit()
      draw()
    },
    dispose() {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (!res) return
      freeSized()
      gl.deleteProgram(res.step.prog)
      gl.deleteProgram(res.show.prog)
      gl.deleteVertexArray(res.vao)
      gl.deleteBuffer(res.buf)
      res = null
    },
  }
}

const LilypodBg = forwardRef(function LilypodBg(_, ref) {
  const canvasRef = useRef(null)
  const waterRef  = useRef(null)

  useImperativeHandle(ref, () => ({
    ripple(clientX, clientY) {
      waterRef.current?.splash(clientX, clientY)
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let resizeTimer = 0

    const img = new Image()
    img.src = waterlily
    img.decode()
      .then(() => {
        if (cancelled) return
        waterRef.current = createWater(canvas, img)
        canvas.classList.add('is-ready')
      })
      .catch(() => {})

    // Wait for the size to settle — phone URL bars fire a burst of resizes
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => waterRef.current?.resize(), 150)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      waterRef.current?.dispose()
      waterRef.current = null
    }
  }, [])

  return <canvas ref={canvasRef} className="lilypod-bg" aria-hidden="true" />
})

export default LilypodBg
