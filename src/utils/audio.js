/**
 * AudioManager — WTF! App
 *
 * Règle #1 : L'AudioContext est créé UNIQUEMENT au premier appel play() (= geste utilisateur).
 *            Aucun code ne crée ou resume l'AudioContext avant un geste.
 *
 * Défauts : Son ON, Musique OFF, Vibration ON
 */

class AudioManager {
  constructor() {
    // Audio context — null tant qu'aucun geste utilisateur
    this._ctx = null
    this._musicGain = null
    this._sfxGain = null

    // Music state
    this._musicTimers = []
    this._playing = false

    // File audio tracking
    this._activeFileAudios = new Set()

    // Settings — tout OFF par défaut (le joueur active dans les paramètres)
    this._sfxEnabled = localStorage.getItem('wtf_sfx') === 'true'
    this._musicEnabled = localStorage.getItem('wtf_music') === 'true'
    this._vibrationEnabled = localStorage.getItem('wtf_vibration') !== 'false'

    // Lifecycle
    this._isHidden = false
    this._wasPlayingBeforeHide = false

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._onBackground()
      else this._onForeground()
    })
  }

  // ── AudioContext (lazy, only on user gesture) ──────────────────────

  _ensureCtx() {
    if (this._ctx) return this._ctx
    this._ctx = new (window.AudioContext || window.webkitAudioContext)()
    this._musicGain = this._ctx.createGain()
    this._musicGain.gain.value = 0.13
    this._musicGain.connect(this._ctx.destination)
    this._sfxGain = this._ctx.createGain()
    this._sfxGain.gain.value = 0.55
    this._sfxGain.connect(this._ctx.destination)
    return this._ctx
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  _onBackground() {
    if (this._isHidden) return
    this._isHidden = true
    this._wasPlayingBeforeHide = this._playing

    if (this._playing) {
      this._playing = false
      this._musicTimers.forEach(clearTimeout)
      this._musicTimers = []
    }

    if (this._ctx) this._ctx.suspend().catch(() => {})

    this._activeFileAudios.forEach(a => {
      if (!a.paused) { a.pause(); a._pausedByLife = true }
    })
  }

  _onForeground() {
    if (!this._isHidden) return
    this._isHidden = false

    // Resume context only if it exists (was created by a gesture)
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {})
    }

    if (this._wasPlayingBeforeHide && this._musicEnabled && this._ctx) {
      this._wasPlayingBeforeHide = false
      this.startMusic()
    }

    this._activeFileAudios.forEach(a => {
      if (a._pausedByLife) { a._pausedByLife = false; a.play().catch(() => {}) }
    })
  }

  // ── Tone (low-level) ──────────────────────────────────────────────

  _tone(freq, dur, type = 'sine', vol = 0.3, delay = 0, dest = 'sfx') {
    if (!this._ctx) return
    try {
      const c = this._ctx
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

  // ── SFX (called on user gesture → safe to create ctx) ─────────────

  play(name) {
    if (!this._sfxEnabled) return

    // Premier appel = premier geste = on crée le ctx
    try { this._ensureCtx() } catch (_) { return }
    if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {})

    switch (name) {
      case 'click':
        this._tone(880, 0.06, 'sine', 0.12)
        break
      case 'correct':
        this._tone(523.25, 0.12, 'sine', 0.3)
        this._tone(659.25, 0.12, 'sine', 0.35, 0.1)
        this._tone(783.99, 0.3, 'sine', 0.4, 0.22)
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
        this.playFile(wrongSounds[Math.floor(Math.random() * wrongSounds.length)].slice(1), 0.2)
        break
      }
      case 'buzzer':
        this._tone(150, 0.15, 'square', 0.3)
        this._tone(100, 0.15, 'square', 0.25, 0.05)
        break
      case 'reveal':
        this._tone(440, 0.10, 'sine', 0.10)
        this._tone(554, 0.14, 'sine', 0.15, 0.09)
        this._tone(659, 0.18, 'sine', 0.20, 0.20)
        this._tone(880, 0.45, 'sine', 0.28, 0.32)
        break
      case 'stamp':
        this._tone(880, 0.04, 'square', 0.45)
        this._tone(660, 0.06, 'square', 0.35, 0.03)
        break
      case 'points':
        this._tone(1047, 0.08, 'sine', 0.28)
        this._tone(1319, 0.10, 'sine', 0.35, 0.08)
        this._tone(1568, 0.12, 'sine', 0.40, 0.19)
        this._tone(1760, 0.08, 'sine', 0.38, 0.33)
        this._tone(1047, 0.06, 'sine', 0.30, 0.43)
        break
      case 'timeout':
        this._tone(330, 0.28, 'square', 0.12)
        this._tone(277, 0.35, 'square', 0.12, 0.22)
        this._tone(220, 0.5, 'square', 0.10, 0.45)
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

  // ── Music ──────────────────────────────────────────────────────────

  startMusic() {
    if (!this._musicEnabled || this._playing || !this._ctx) return
    this._playing = true

    const BPM = 130
    const B = 60 / BPM

    const C3 = 130.81, G3 = 196.00, F3 = 174.61, Am3 = 220.00
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23
    const G4 = 392.00, A4 = 440.00, B4 = 493.88, C5 = 523.25
    const D5 = 587.33

    const melody = [
      [C4, 0.0, 0.45], [E4, 0.5, 0.4], [G4, 1.0, 0.45], [E4, 1.5, 0.4],
      [C4, 2.0, 0.4], [D4, 2.5, 0.4], [E4, 3.0, 1.4],
      [G4, 4.5, 0.4], [A4, 5.0, 0.45], [G4, 5.5, 0.4], [E4, 6.0, 0.4], [D4, 6.5, 0.4],
      [C4, 7.0, 0.4], [E4, 7.5, 0.4], [G4, 8.0, 0.4], [C5, 8.5, 0.4],
      [B4, 9.0, 0.4], [A4, 9.5, 0.4], [G4, 10.0, 0.85],
      [A4, 10.5, 0.4], [G4, 11.0, 0.4], [E4, 11.5, 0.4],
      [D4, 12.0, 0.4], [E4, 12.5, 0.4], [F4, 13.0, 0.45], [E4, 13.5, 0.4],
      [D5, 14.0, 0.45], [C5, 14.5, 0.4], [B4, 15.0, 0.4], [A4, 15.5, 0.4],
      [G4, 16.0, 0.85], [E4, 17.0, 0.4], [C4, 17.5, 0.4], [G4, 18.0, 1.6],
    ]

    const bass = [C3, C3, F3, F3, Am3, Am3, G3, G3, C3, C3, F3, F3, G3, G3, C3, C3]

    const chords = [
      [1, [C4, E4, G4]], [3, [C4, E4, G4]], [5, [F3, A4, C5]], [7, [F3, A4, C5]],
      [9, [C4, E4, G4]], [11, [C4, E4, G4]], [13, [G3, B4, D5]], [15, [G3, B4, D5]],
    ]

    const LOOP_MS = 20 * B * 1000

    const scheduleLoop = () => {
      if (!this._playing) return

      melody.forEach(([freq, beat, dur]) => {
        this._musicTimers.push(setTimeout(() => {
          if (!this._playing) return
          this._tone(freq, dur * B, 'triangle', 0.11, 0, 'music')
          this._tone(freq * 1.003, dur * B * 0.9, 'triangle', 0.06, 0.008, 'music')
        }, beat * B * 1000))
      })

      bass.forEach((freq, i) => {
        this._musicTimers.push(setTimeout(() => {
          if (!this._playing) return
          this._tone(freq, B * 1.6, 'sine', 0.22, 0, 'music')
        }, i * 2 * B * 1000))
      })

      chords.forEach(([beat, freqs]) => {
        this._musicTimers.push(setTimeout(() => {
          if (!this._playing) return
          freqs.forEach(f => this._tone(f, B * 0.35, 'sine', 0.055, 0, 'music'))
        }, beat * B * 1000))
      })

      this._musicTimers.push(setTimeout(scheduleLoop, LOOP_MS))
    }

    this._musicTimers.push(setTimeout(scheduleLoop, 200))
  }

  stopMusic() {
    this._playing = false
    this._musicTimers.forEach(clearTimeout)
    this._musicTimers = []
  }

  // ── File playback (MP3/MP4) ────────────────────────────────────────

  playFile(filename, volume = 0.25) {
    if (!this._sfxEnabled) return
    try {
      const a = new Audio(`/${filename}`)
      a.volume = volume
      this._activeFileAudios.add(a)
      a.addEventListener('ended', () => this._activeFileAudios.delete(a))
      a.addEventListener('error', () => this._activeFileAudios.delete(a))
      a.play().catch(() => {})
    } catch (_) {}
  }

  stopAll() {
    this._activeFileAudios.forEach(a => { a.pause(); a.currentTime = 0 })
    this._activeFileAudios.clear()
  }

  // ── Settings ───────────────────────────────────────────────────────

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
}

export const audio = new AudioManager()
