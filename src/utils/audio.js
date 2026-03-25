// Procedural audio — no external files needed

class AudioManager {
  constructor() {
    this._ctx = null
    this._musicGain = null
    this._sfxGain = null
    this._musicOscs = []
    this._musicTimers = []
    this._playing = false
    this._musicEnabled = localStorage.getItem('wtf_music') !== 'false'
    this._sfxEnabled = localStorage.getItem('wtf_sfx') !== 'false'
  }

  _ctx_get() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)()
      this._musicGain = this._ctx.createGain()
      this._musicGain.gain.value = 0.13
      this._musicGain.connect(this._ctx.destination)
      this._sfxGain = this._ctx.createGain()
      this._sfxGain.gain.value = 0.55
      this._sfxGain.connect(this._ctx.destination)
    }
    if (this._ctx.state === 'suspended') this._ctx.resume()
    return this._ctx
  }

  // Low-level tone helper
  _tone(freq, dur, type = 'sine', vol = 0.3, delay = 0, dest = 'sfx') {
    try {
      const c = this._ctx_get()
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = type
      osc.frequency.value = freq
      osc.connect(g)
      g.connect(dest === 'music' ? this._musicGain : this._sfxGain)
      const t = c.currentTime + delay
      g.gain.setValueAtTime(0.001, t)
      g.gain.linearRampToValueAtTime(vol, t + 0.015)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.start(t)
      osc.stop(t + dur + 0.05)
    } catch (_) {}
  }

  play(name) {
    if (!this._sfxEnabled) return
    try { this._ctx_get() } catch (_) { return }

    switch (name) {
      case 'click':
        this._tone(880, 0.06, 'sine', 0.12)
        break
      case 'correct':
        this._tone(523.25, 0.12, 'sine', 0.3)
        this._tone(659.25, 0.12, 'sine', 0.35, 0.1)
        this._tone(783.99, 0.3,  'sine', 0.4,  0.22)
        break
      case 'wrong':
        this._tone(220, 0.14, 'sawtooth', 0.18)
        this._tone(185, 0.35, 'sawtooth', 0.14, 0.12)
        break
      case 'reveal':
        this._tone(440, 0.10, 'sine', 0.10)
        this._tone(554, 0.14, 'sine', 0.15, 0.09)
        this._tone(659, 0.18, 'sine', 0.20, 0.20)
        this._tone(880, 0.45, 'sine', 0.28, 0.32)
        break
      case 'points':
        this._tone(1047, 0.08, 'sine', 0.22)
        this._tone(1319, 0.18, 'sine', 0.28, 0.08)
        break
      case 'timeout':
        this._tone(330, 0.28, 'square', 0.12)
        this._tone(277, 0.35, 'square', 0.12, 0.22)
        this._tone(220, 0.5,  'square', 0.10, 0.45)
        break
      case 'tick':
        this._tone(1200, 0.035, 'square', 0.06)
        break
      case 'home':
        this._tone(392, 0.15, 'sine', 0.18)
        this._tone(523, 0.25, 'sine', 0.18, 0.13)
        break
      default: break
    }
  }

  startMusic() {
    if (!this._musicEnabled || this._playing) return
    try { this._ctx_get() } catch (_) { return }
    this._playing = true

    const c = this._ctx

    // Bass drone — A2
    const bass = c.createOscillator()
    const bassG = c.createGain()
    const bassF = c.createBiquadFilter()
    bassF.type = 'lowpass'
    bassF.frequency.value = 280
    bass.type = 'sine'
    bass.frequency.value = 110
    bassG.gain.value = 0.55
    bass.connect(bassF); bassF.connect(bassG); bassG.connect(this._musicGain)
    bass.start()
    this._musicOscs.push(bass, bassG, bassF)

    // Pad — A minor chord (A3, C4, E4) with slow filter sweep
    ;[220, 261.63, 329.63].forEach((freq, i) => {
      const osc = c.createOscillator()
      const g = c.createGain()
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(350, c.currentTime)
      f.frequency.linearRampToValueAtTime(750, c.currentTime + 6)
      f.frequency.linearRampToValueAtTime(350, c.currentTime + 12)
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.detune.value = (i - 1) * 4
      g.gain.value = 0.13
      osc.connect(f); f.connect(g); g.connect(this._musicGain)
      osc.start()
      this._musicOscs.push(osc, g, f)
    })

    // Melodic loop — A minor pentatonic
    const melodyNotes = [
      [440, 0], [523.25, 2.5], [587.33, 5], [659.25, 7],
      [587.33, 9], [523.25, 11.5], [440, 14], [392, 16.5],
    ]
    const LOOP_MS = 20000

    const scheduleLoop = () => {
      if (!this._playing) return
      melodyNotes.forEach(([freq, offset]) => {
        const t = setTimeout(() => {
          if (this._playing) this._tone(freq, 1.8, 'sine', 0.07, 0, 'music')
        }, offset * 1000)
        this._musicTimers.push(t)
      })
      const loop = setTimeout(scheduleLoop, LOOP_MS)
      this._musicTimers.push(loop)
    }

    const start = setTimeout(scheduleLoop, 1500)
    this._musicTimers.push(start)
  }

  stopMusic() {
    this._playing = false
    this._musicOscs.forEach(n => { try { n.stop?.(); n.disconnect?.() } catch (_) {} })
    this._musicOscs = []
    this._musicTimers.forEach(clearTimeout)
    this._musicTimers = []
  }

  get musicEnabled() { return this._musicEnabled }
  get sfxEnabled() { return this._sfxEnabled }

  setMusicEnabled(val) {
    this._musicEnabled = val
    localStorage.setItem('wtf_music', String(val))
    if (val) this.startMusic()
    else this.stopMusic()
  }

  setSfxEnabled(val) {
    this._sfxEnabled = val
    localStorage.setItem('wtf_sfx', String(val))
  }
}

export const audio = new AudioManager()
