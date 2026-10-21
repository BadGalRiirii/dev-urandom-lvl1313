// Small synthesised sounds — no audio files to download.

export function createSound() {
  let ac = null
  let muted = false

  const ctx = () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)()
    if (ac.state === 'suspended') ac.resume()
    return ac
  }

  // A burst of filtered noise: the swish of the blade through fruit
  const noise = (dur, from, to, gain) => {
    const a = ctx()
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = a.createBufferSource()
    src.buffer = buf
    const f = a.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.2
    f.frequency.setValueAtTime(from, a.currentTime)
    f.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur)
    const g = a.createGain()
    g.gain.setValueAtTime(gain, a.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur)
    src.connect(f).connect(g).connect(a.destination)
    src.start()
  }

  const tone = (freq, dur, gain, type = 'triangle', endFreq = freq, delay = 0) => {
    const a = ctx()
    const t = a.currentTime + delay
    const o = a.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    o.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
    const g = a.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(a.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  const play = (fn) => { if (!muted) { try { fn() } catch { /* audio unavailable */ } } }

  return {
    unlock: () => { try { ctx() } catch { /* no audio */ } },   // must run inside a click
    set muted(v) { muted = v },
    get muted() { return muted },
    slice:  () => play(() => noise(0.16, 3200, 700, 0.35)),
    scarab: () => play(() => { tone(140, 0.45, 0.4, 'sawtooth', 45); noise(0.3, 600, 120, 0.3) }),
    miss:   () => play(() => tone(220, 0.35, 0.12, 'sine', 160)),
    combo:  () => play(() => { tone(880, 0.25, 0.12); tone(1320, 0.35, 0.1, 'triangle', 1320, 0.08) }),

    // The Hourglass
    tick:   () => play(() => tone(700, 0.04, 0.035, 'triangle')),
    turn:   () => play(() => tone(520, 0.08, 0.05, 'triangle', 760)),
    pour:   () => play(() => noise(0.32, 2400, 500, 0.16)),
    // a rising chime, one note higher for each clear in a row
    bridge: (chain = 1) => play(() => {
      const steps = [0, 4, 7, 12, 16, 19, 24]
      const root = 523.25 * 2 ** (steps[Math.min(chain - 1, steps.length - 1)] / 12)
      tone(root, 0.5, 0.11); tone(root * 1.5, 0.6, 0.08, 'triangle', root * 1.5, 0.07); tone(root * 2, 0.7, 0.06, 'sine', root * 2, 0.14)
      noise(0.5, 6000, 2500, 0.06)
    }),
    over:   () => play(() => { tone(392, 0.5, 0.12, 'sine', 330); tone(294, 0.9, 0.12, 'sine', 196, 0.3) }),
  }
}
