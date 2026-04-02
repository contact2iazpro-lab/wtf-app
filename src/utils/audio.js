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
    this._vibrationEnabled = localStorage.getItem('wtf_vibration') !== 'false'

    // Lifecycle — track state to restore on foreground
    this._isHidden = false
    this._wasPlayingBeforeHide = false
    this._activeFileAudios = new Set() // Track HTML Audio elements from playFile()

    // Register lifecycle listeners (bound once, never leak)
    this._onVisibilityChange = () => {
      if (document.hidden) this._handleBackground()
      else this._handleForeground()
    }
    this._onPageHide = () => this._handleBackground()
    this._onPageShow = () => this._handleForeground()

    document.addEventListener('visibilitychange', this._onVisibilityChange)
    window.addEventListener('pagehide', this._onPageHide)
    window.addEventListener('pageshow', this._onPageShow)
  }

  _handleBackground() {
    if (this._isHidden) return // Guard against double-firing
    this._isHidden = true

    // Remember if music was playing so we can restart on foreground
    this._wasPlayingBeforeHide = this._playing

    // Stop music timers — prevents scheduled notes firing in background
    if (this._playing) {
      this._playing = false
      this._musicTimers.forEach(clearTimeout)
      this._musicTimers = []
    }

    // Suspend Web Audio context (stops oscillator output instantly)
    this._ctx?.suspend?.()

    // Pause all active HTML Audio elements (MP3 files)
    this._activeFileAudios.forEach(a => {
      if (!a.paused) {
        a.pause()
        a._pausedByLifecycle = true
      }
    })
  }

  _handleForeground() {
    if (!this._isHidden) return // Guard against double-firing
    this._isHidden = false

    // Resume Web Audio context
    this._ctx?.resume?.()

    // Restart music if it was playing before hiding
    if (this._wasPlayingBeforeHide && this._musicEnabled) {
      this._wasPlayingBeforeHide = false
      this.startMusic()
    }

    // Resume MP3 files that were paused by lifecycle
    this._activeFileAudios.forEach(a => {
      if (a._pausedByLifecycle) {
        a._pausedByLifecycle = false
        a.play().catch(() => {})
      }
    })
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
      case 'wrong': {
        const wrongSounds = [
          '/sounds/wrong/Au_Suivant.mp4',
          '/sounds/wrong/Dommage.mp4',
          '/sounds/wrong/Ha_la_la.mp4',
          '/sounds/wrong/Nan_c_est_pas_ca.mp4',
          '/sounds/wrong/Oh_essaye_un_autre.mp4',
          '/sounds/wrong/Oh_non.mp4',
          '/sounds/wrong/Prochaine_question.mp4',
          '/sounds/wrong/Rat\u00e9.mp4',
          '/sounds/wrong/What_the.mp4',
        ]
        const randomWrongSound = wrongSounds[Math.floor(Math.random() * wrongSounds.length)]
        const wrongAudio = new Audio(randomWrongSound)
        wrongAudio.play().catch(() => {})
        break
      }
      case 'reveal':
        this._tone(440, 0.10, 'sine', 0.10)
        this._tone(554, 0.14, 'sine', 0.15, 0.09)
        this._tone(659, 0.18, 'sine', 0.20, 0.20)
        this._tone(880, 0.45, 'sine', 0.28, 0.32)
        break
      case 'stamp':
        // Sharp, crisp stamp hitting paper — percussive square wave burst
        this._tone(880, 0.04, 'square', 0.45)
        this._tone(660, 0.06, 'square', 0.35, 0.03)
        break
      case 'points':
        // Coins tinkling like a jackpot — ascending ding-ding-ding sequence
        this._tone(1047, 0.08, 'sine', 0.28)
        this._tone(1319, 0.10, 'sine', 0.35, 0.08)
        this._tone(1568, 0.12, 'sine', 0.40, 0.19)
        this._tone(1760, 0.08, 'sine', 0.38, 0.33)
        this._tone(1047, 0.06, 'sine', 0.30, 0.43)
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

    // ── Fun, upbeat, kid-friendly music in C major ─────────────────
    // 130 BPM — style platformer / quiz show
    const BPM = 130
    const B = 60 / BPM // beat = 0.4615s

    // Note frequencies — C major scale
    const C3=130.81, G3=196.00, F3=174.61, Am3=220.00
    const C4=261.63, D4=293.66, E4=329.63, F4=349.23
    const G4=392.00, A4=440.00, B4=493.88, C5=523.25
    const D5=587.33, E5=659.25

    // Melody (offset in beats, duration in beats)
    // 16-beat loop (4 bars of 4/4)
    const melody = [
      // Bar 1 — bouncy ascending
      [C4, 0.0, 0.45], [E4, 0.5, 0.4], [G4, 1.0, 0.45], [E4, 1.5, 0.4],
      // Bar 2
      [C4, 2.0, 0.4], [D4, 2.5, 0.4], [E4, 3.0, 1.4],
      // Bar 3 — higher run
      [G4, 4.5, 0.4], [A4, 5.0, 0.45], [G4, 5.5, 0.4], [E4, 6.0, 0.4], [D4, 6.5, 0.4],
      // Bar 4
      [C4, 7.0, 0.4], [E4, 7.5, 0.4], [G4, 8.0, 0.4], [C5, 8.5, 0.4],
      // Bar 5 — goes higher
      [B4, 9.0, 0.4], [A4, 9.5, 0.4], [G4, 10.0, 0.85],
      [A4, 10.5, 0.4], [G4, 11.0, 0.4], [E4, 11.5, 0.4],
      // Bar 6
      [D4, 12.0, 0.4], [E4, 12.5, 0.4], [F4, 13.0, 0.45], [E4, 13.5, 0.4],
      // Bar 7 — climax
      [D5, 14.0, 0.45], [C5, 14.5, 0.4], [B4, 15.0, 0.4], [A4, 15.5, 0.4],
      // Bar 8 — resolution
      [G4, 16.0, 0.85], [E4, 17.0, 0.4], [C4, 17.5, 0.4], [G4, 18.0, 1.6],
    ]

    // Bass line (one note per 2 beats = half notes)
    const bass = [
      C3, C3, F3, F3,   // bars 1-2
      Am3, Am3, G3, G3, // bars 3-4
      C3, C3, F3, F3,   // bars 5-6
      G3, G3, C3, C3,   // bars 7-8
    ]

    // Chord stabs on beats 2 & 4 (C major / F major alternating)
    const chordBeats = [
      [1, [C4, E4, G4]],
      [3, [C4, E4, G4]],
      [5, [F3, A4, C5]],
      [7, [F3, A4, C5]],
      [9, [C4, E4, G4]],
      [11, [C4, E4, G4]],
      [13, [G3, B4, D5]],
      [15, [G3, B4, D5]],
    ]

    const LOOP_BEATS = 20
    const LOOP_MS = LOOP_BEATS * B * 1000

    const scheduleLoop = () => {
      if (!this._playing) return

      // Melody — triangle wave (bright, sweet)
      melody.forEach(([freq, beat, dur]) => {
        const t = setTimeout(() => {
          if (!this._playing) return
          this._tone(freq, dur * B, 'triangle', 0.11, 0, 'music')
          // Chorus — tiny detune second layer
          this._tone(freq * 1.003, dur * B * 0.9, 'triangle', 0.06, 0.008, 'music')
        }, beat * B * 1000)
        this._musicTimers.push(t)
      })

      // Bass — sine, one hit per 2 beats
      bass.forEach((freq, i) => {
        const t = setTimeout(() => {
          if (!this._playing) return
          this._tone(freq, B * 1.6, 'sine', 0.22, 0, 'music')
        }, i * 2 * B * 1000)
        this._musicTimers.push(t)
      })

      // Chord stabs — short, punchy
      chordBeats.forEach(([beat, freqs]) => {
        const t = setTimeout(() => {
          if (!this._playing) return
          freqs.forEach(f => this._tone(f, B * 0.35, 'sine', 0.055, 0, 'music'))
        }, beat * B * 1000)
        this._musicTimers.push(t)
      })

      // Loop
      const loop = setTimeout(scheduleLoop, LOOP_MS)
      this._musicTimers.push(loop)
    }

    const start = setTimeout(scheduleLoop, 200)
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
  get vibrationEnabled() { return this._vibrationEnabled }

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

  setVibrationEnabled(val) {
    this._vibrationEnabled = val
    localStorage.setItem('wtf_vibration', String(val))
  }

  vibrate(pattern = 30) {
    if (!this._vibrationEnabled) return
    try { navigator.vibrate?.(pattern) } catch (_) {}
  }

  // Stop all currently playing file audios
  stopAll() {
    this._activeFileAudios.forEach(a => {
      a.pause()
      a.currentTime = 0
    })
    this._activeFileAudios.clear()
  }

  // Play audio files from public directory
  playFile(filename) {
    if (!this._sfxEnabled) return
    try {
      const a = new Audio(`/${filename}`)
      a.volume = 0.7
      this._activeFileAudios.add(a)
      a.addEventListener('ended', () => this._activeFileAudios.delete(a))
      a.addEventListener('error', () => this._activeFileAudios.delete(a))
      a.play().catch(() => {})
    } catch (_) {}
  }
}

export const audio = new AudioManager()
