/**
 * No-op audio stub for game components rendered in admin-tool preview context.
 * Prevents AudioContext creation and sound playback in the preview panel.
 */
export const audio = {
  play: () => {},
  playFile: () => {},
  vibrate: () => {},
  startMusic: () => {},
  stopMusic: () => {},
  get musicEnabled() { return false },
  get sfxEnabled() { return false },
  get vibrationEnabled() { return false },
  setMusicEnabled: () => {},
  setSfxEnabled: () => {},
  setVibrationEnabled: () => {},
}
