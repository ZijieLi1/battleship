// Synthesises placeholder sound effects (mono 16-bit WAV). Swap the files in
// public/audio for real CC0 recordings at any time; names are what matter.
import { writeFileSync } from 'node:fs'

const SR = 22050
const noise = () => Math.random() * 2 - 1

function render(seconds, fn) {
  const n = Math.floor(seconds * SR)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = fn(i / SR, i)
  return out
}
function lowpass(buf, a) {
  let y = 0
  return buf.map((x) => (y += a * (x - y)))
}
function wav(name, buf) {
  const peak = Math.max(...buf.map(Math.abs)) || 1
  const data = Buffer.alloc(44 + buf.length * 2)
  data.write('RIFF', 0); data.writeUInt32LE(36 + buf.length * 2, 4); data.write('WAVE', 8)
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22)
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34)
  data.write('data', 36); data.writeUInt32LE(buf.length * 2, 40)
  buf.forEach((v, i) => data.writeInt16LE(Math.round((v / peak) * 0.9 * 32767), 44 + i * 2))
  writeFileSync(`public/audio/${name}.wav`, data)
}

// Cannon: pitch-dropping thump + crack + rumbling tail.
{
  let ph = 0
  const tail = lowpass(render(1.2, () => noise()), 0.06)
  wav('cannon', render(1.2, (t, i) => {
    ph += (2 * Math.PI * (35 + 110 * Math.exp(-t * 14))) / SR
    return Math.sin(ph) * Math.exp(-t * 5) * 1.2 + noise() * Math.exp(-t * 40) * 0.8 + tail[i] * Math.exp(-t * 3) * 3
  }))
}
// Torpedo launch: compressed-air whoosh + low motor hum.
{
  const air = lowpass(render(1.4, () => noise()), 0.25)
  wav('torpedo', render(1.4, (t, i) => {
    const env = Math.min(t / 0.08, 1) * Math.exp(-t * 2.2)
    return air[i] * env * 2 + Math.sin(2 * Math.PI * 70 * t) * 0.3 * Math.exp(-t * 1.5)
  }))
}
// Splash: bright noise burst with a quick low thud.
{
  const n = render(1.0, () => noise())
  const lp = lowpass(n, 0.5)
  wav('splash', render(1.0, (t, i) => (n[i] - lp[i]) * Math.exp(-t * 5) * 0.8 + lp[i] * Math.exp(-t * 9) * 0.8))
}
// Metal explosion: heavy boom, noise crunch, ringing metallic overtones.
{
  let ph = 0
  const crunch = lowpass(render(1.8, () => noise()), 0.2)
  wav('explosion', render(1.8, (t, i) => {
    ph += (2 * Math.PI * (30 + 80 * Math.exp(-t * 8))) / SR
    const ring = (Math.sin(2 * Math.PI * 520 * t) + Math.sin(2 * Math.PI * 811 * t)) * 0.12 * Math.exp(-t * 7)
    return Math.sin(ph) * Math.exp(-t * 2.6) + crunch[i] * Math.exp(-t * 2.2) * 2.4 + noise() * Math.exp(-t * 30) + ring
  }))
}
