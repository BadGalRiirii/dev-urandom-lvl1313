// The Hourglass's sounds, all synthesised — no audio files to download.
//
// Everything is tuned to one gentle five-note scale (D major pentatonic), so the
// plucks, the runs and the slow chords underneath can never clash. A soft synthetic
// reverb gives it the air of a large, quiet room.

const SCALE = [0, 2, 4, 7, 9]
const ROOT  = 146.83                       // D3
const note  = (n) => ROOT * 2 ** ((12 * Math.floor(n / 5) + SCALE[((n % 5) + 5) % 5]) / 12)

// Slow chords under the game: Dmaj9 · Bm7 · Gmaj9 · A6/9, as scale steps
const CHORDS = [[0, 2, 4, 6, 8], [-2, 0, 3, 5, 7], [-4, -1, 1, 4, 6], [-3, 0, 2, 4, 7]]
const CHORD_SECONDS = 9

export function createSound() {
  let ac = null, master = null, wet = null, dry = null
  let muted = false
  let pad = null

  const ctx = () => {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)()
      master = ac.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(ac.destination)
      dry = ac.createGain(); dry.gain.value = 0.8; dry.connect(master)
      // reverb: a few seconds of decaying noise as the room's echo
      const len = Math.floor(ac.sampleRate * 3.2)
      const ir = ac.createBuffer(2, len, ac.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch)
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6
      }
      const verb = ac.createConvolver()
      verb.buffer = ir
      wet = ac.createGain(); wet.gain.value = 0.55
      verb.connect(wet).connect(master)
      dry.verb = verb
    }
    if (ac.state === 'suspended') ac.resume()
    return ac
  }
  const out = (node, reverb = 0.5) => {
    node.connect(dry)
    if (reverb) { const s = ac.createGain(); s.gain.value = reverb; node.connect(s).connect(dry.verb) }
  }

  // A plucked string: a bright attack that mellows as it fades
  const pluck = (freq, gain, dur = 1.2, delay = 0, reverb = 0.6) => {
    const a = ctx(), t = a.currentTime + delay
    const g = a.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const f = a.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(Math.min(9000, freq * 9), t)
    f.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), t + dur * 0.7)
    for (const [mult, type, level] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]]) {
      const o = a.createOscillator()
      o.type = type
      o.frequency.value = freq * mult
      const og = a.createGain(); og.gain.value = level
      o.connect(og).connect(f)
      o.start(t); o.stop(t + dur + 0.05)
    }
    f.connect(g)
    out(g, reverb)
  }

  // A bell: long, pure, with a slightly out-of-tune partial for shimmer
  const bell = (freq, gain, delay = 0) => {
    const a = ctx(), t = a.currentTime + delay
    for (const [mult, level, dur] of [[1, 1, 3], [2.76, 0.4, 1.6], [5.4, 0.2, 0.8]]) {
      const o = a.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * mult
      const g = a.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(gain * level, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g)
      out(g, 0.9)
      o.start(t); o.stop(t + dur + 0.05)
    }
  }

  // Pouring sand: soft filtered noise
  const sandHiss = (dur, gain, bright = 1600) => {
    const a = ctx(), t = a.currentTime
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < d.length; i++) {
      last = last * 0.6 + (Math.random() * 2 - 1) * 0.4           // a little darker than white noise
      d[i] = last * (Math.random() < 0.3 ? 1.6 : 0.7)               // and grainy
    }
    const src = a.createBufferSource(); src.buffer = buf
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright
    const g = a.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g)
    out(g, 0.3)
    src.start(t)
  }

  // The slow chords: soft sines drifting from one chord to the next
  const startPad = () => {
    const a = ctx()
    if (pad) return
    const bus = a.createGain()
    bus.gain.setValueAtTime(0.0001, a.currentTime)
    bus.gain.exponentialRampToValueAtTime(0.045, a.currentTime + 4)
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900
    bus.connect(f)
    out(f, 0.8)
    const voices = CHORDS[0].map((n, i) => {
      const o = a.createOscillator()
      o.type = i % 2 ? 'sine' : 'triangle'
      o.frequency.value = note(n)
      o.detune.value = (i - 2) * 4
      const g = a.createGain(); g.gain.value = i === 0 ? 0.5 : 0.28
      o.connect(g).connect(bus)
      o.start()
      return o
    })
    let at = 0
    const timer = setInterval(() => {
      at = (at + 1) % CHORDS.length
      CHORDS[at].forEach((n, i) => voices[i].frequency.setTargetAtTime(note(n), a.currentTime, 1.4))
    }, CHORD_SECONDS * 1000)
    pad = { bus, voices, timer }
  }
  const stopPad = () => {
    if (!pad) return
    const { bus, voices, timer } = pad
    pad = null
    clearInterval(timer)
    const t = ac.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setTargetAtTime(0.0001, t, 0.8)
    voices.forEach((o) => o.stop(t + 4))
  }

  const play = (fn) => { if (!muted) { try { fn() } catch { /* audio unavailable */ } } }
  let turnStep = 0

  return {
    unlock: () => { try { ctx() } catch { /* no audio */ } },   // must run inside a tap or click
    set muted(v) {
      muted = v
      if (master) master.gain.setTargetAtTime(v ? 0 : 1, ac.currentTime, 0.05)
    },
    get muted() { return muted },
    music(on) { try { if (on) startPad(); else stopPad() } catch { /* no audio */ } },

    tick:  () => play(() => pluck(note(17), 0.018, 0.25, 0, 0.2)),
    turn:  () => play(() => { turnStep = (turnStep + 1) % 5; pluck(note(12 + turnStep), 0.05, 0.9) }),
    hold:  () => play(() => { pluck(note(10), 0.045, 1); pluck(note(14), 0.035, 1, 0.07) }),
    land:  (dropped) => play(() => { sandHiss(dropped ? 0.7 : 0.45, dropped ? 0.11 : 0.07); pluck(note(dropped ? 0 : 5), dropped ? 0.07 : 0.045, 1.4, 0, 0.7) }),
    // a harp run upward — starting higher for each clear in a row
    bridge: (chain = 1) => play(() => {
      const from = 8 + Math.min(chain - 1, 4) * 2
      for (let i = 0; i < 8; i++) pluck(note(from + i), 0.06 - i * 0.004, 1.8, i * 0.055, 0.8)
      bell(note(from + 10), 0.03, 0.45)
    }),
    level: () => play(() => { bell(note(10), 0.05); bell(note(14), 0.035, 0.25) }),
    over:  () => play(() => {
      stopPad()
      ;[12, 9, 7, 4, 0].forEach((n, i) => pluck(note(n), 0.06, 2.2, i * 0.28, 0.9))
    }),
  }
}
