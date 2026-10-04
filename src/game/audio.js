// HTML5 Audio one-shots. Files are synthesised by tools/gen-audio.mjs; replace freely.
const FILES = {
  cannon: '/audio/cannon.wav',
  torpedo: '/audio/torpedo.wav',
  splash: '/audio/splash.wav',
  explosion: '/audio/explosion.wav',
}
const cache = {}
export const audio = {
  muted: false,
  preload() {
    for (const [k, src] of Object.entries(FILES)) {
      cache[k] = new Audio(src)
      cache[k].preload = 'auto'
    }
  },
  play(name, volume = 1) {
    if (this.muted || !FILES[name]) return
    const a = (cache[name] ?? new Audio(FILES[name])).cloneNode()
    a.volume = Math.min(1, volume)
    a.play().catch(() => {}) // autoplay may be blocked before first user gesture
  },
}
