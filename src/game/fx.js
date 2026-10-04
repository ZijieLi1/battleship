// CPU particle pool rendered by components/Particles.jsx. Emit from anywhere.
const MAX = 4000
const P = Array.from({ length: MAX }, () => ({ alive: false }))
let cursor = 0
const r = (a, b) => a + Math.random() * (b - a)

export function emit(o) {
  const p = P[cursor]
  cursor = (cursor + 1) % MAX
  p.alive = true
  p.x = o.x; p.y = o.y; p.z = o.z
  p.vx = o.vx ?? 0; p.vy = o.vy ?? 0; p.vz = o.vz ?? 0
  p.g = o.g ?? 0; p.drag = o.drag ?? 0
  p.age = 0; p.life = o.life ?? 1
  p.s0 = o.s0 ?? 1; p.s1 = o.s1 ?? o.s0 ?? 1
  p.c0 = o.c0 ?? [1, 1, 1]; p.c1 = o.c1 ?? p.c0
  p.a0 = o.a0 ?? 1; p.a1 = o.a1 ?? 0
}

export function updateParticles(dt, pos, col, size) {
  for (let i = 0; i < MAX; i++) {
    const p = P[i]
    if (p.alive) {
      p.age += dt
      if (p.age >= p.life) p.alive = false
    }
    if (!p.alive) {
      size[i] = 0
      continue
    }
    const k = p.age / p.life
    const damp = Math.exp(-p.drag * dt)
    p.vx *= damp; p.vz *= damp
    p.vy = p.vy * damp - p.g * dt
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z
    col[i * 4] = p.c0[0] + (p.c1[0] - p.c0[0]) * k
    col[i * 4 + 1] = p.c0[1] + (p.c1[1] - p.c0[1]) * k
    col[i * 4 + 2] = p.c0[2] + (p.c1[2] - p.c0[2]) * k
    col[i * 4 + 3] = p.a0 + (p.a1 - p.a0) * k
    size[i] = p.s0 + (p.s1 - p.s0) * k
  }
}

const WHITE = [0.95, 0.98, 1], BLUE = [0.55, 0.78, 0.9]
const FIRE0 = [1, 0.85, 0.35], FIRE1 = [0.8, 0.15, 0.03]
const SMOKE0 = [0.25, 0.25, 0.25], SMOKE1 = [0.5, 0.5, 0.52]

export const fx = {
  muzzle([x, y, z], [dx, dz]) {
    emit({ x, y, z, life: 0.14, s0: 3.2, s1: 1, c0: [1, 0.95, 0.7], a0: 1, a1: 0 })
    for (let i = 0; i < 14; i++) {
      const s = r(8, 18)
      emit({ x, y, z, vx: dx * s + r(-2, 2), vy: r(-1, 3), vz: dz * s + r(-2, 2), drag: 3, life: r(0.15, 0.35), s0: 1.2, s1: 0.3, c0: FIRE0, c1: FIRE1 })
    }
    for (let i = 0; i < 12; i++) {
      emit({ x, y, z, vx: dx * r(2, 6) + r(-1, 1), vy: r(0.5, 2), vz: dz * r(2, 6) + r(-1, 1), drag: 1.2, life: r(1, 2), s0: 0.8, s1: 3, c0: SMOKE0, c1: SMOKE1, a0: 0.6 })
    }
  },
  splash([x, , z], scale = 1) {
    for (let i = 0; i < 70 * scale; i++) {
      const a = r(0, Math.PI * 2), h = r(0, 2.2) * scale
      emit({ x, y: 0, z, vx: Math.cos(a) * h, vy: r(7, 15) * scale, vz: Math.sin(a) * h, g: 16, drag: 0.4, life: r(1, 1.8), s0: 1.6 * scale, s1: 0.8, c0: WHITE, c1: BLUE, a0: 0.95 })
    }
    for (let i = 0; i < 36; i++) {
      const a = r(0, Math.PI * 2), s = r(4, 8) * scale
      emit({ x, y: 0.1, z, vx: Math.cos(a) * s, vy: r(0.5, 2), vz: Math.sin(a) * s, g: 4, drag: 2, life: r(0.8, 1.4), s0: 1.2, s1: 2.4, c0: WHITE, c1: BLUE, a0: 0.55 })
    }
  },
  explosion([x, y, z], scale = 1) {
    emit({ x, y, z, life: 0.2, s0: 9 * scale, s1: 3, c0: [1, 0.95, 0.8], a0: 1 })
    for (let i = 0; i < 50 * scale; i++) {
      const a = r(0, Math.PI * 2), u = r(-0.3, 1), s = r(3, 9) * scale
      emit({ x, y, z, vx: Math.cos(a) * s, vy: u * s + 2, vz: Math.sin(a) * s, drag: 1.5, life: r(0.5, 1.1), s0: 2.4 * scale, s1: 0.6, c0: FIRE0, c1: FIRE1 })
    }
    for (let i = 0; i < 30 * scale; i++) {
      emit({ x, y, z, vx: r(-2, 2), vy: r(2, 5), vz: r(-2, 2), drag: 0.6, life: r(2, 3.5), s0: 1.5, s1: 6 * scale, c0: SMOKE0, c1: SMOKE1, a0: 0.7 })
    }
  },
  smoke([x, y, z]) {
    emit({ x: x + r(-0.4, 0.4), y, z: z + r(-0.4, 0.4), vx: r(-0.2, 0.5), vy: r(1.5, 2.5), vz: r(-0.3, 0.3), drag: 0.3, life: r(2, 3), s0: 0.8, s1: 3.2, c0: SMOKE0, c1: SMOKE1, a0: 0.55 })
  },
  fire([x, y, z]) {
    emit({ x: x + r(-0.4, 0.4), y, z: z + r(-0.4, 0.4), vy: r(1, 2.5), life: r(0.4, 0.8), s0: 1.1, s1: 0.2, c0: FIRE0, c1: FIRE1, a0: 0.9 })
  },
  wake([x, , z]) {
    emit({ x: x + r(-0.3, 0.3), y: 0.05, z: z + r(-0.3, 0.3), vx: r(-0.3, 0.3), vz: r(-0.3, 0.3), life: r(1, 1.6), s0: 0.6, s1: 1.8, c0: WHITE, c1: BLUE, a0: 0.45 })
  },
  bubbles([x, y, z]) {
    emit({ x: x + r(-0.5, 0.5), y, z: z + r(-0.5, 0.5), vy: r(1, 3), life: r(0.6, 1.2), s0: 0.35, s1: 0.2, c0: WHITE, a0: 0.7 })
  },
}
