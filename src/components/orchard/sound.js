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
  }
}
