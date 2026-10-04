// Pure game maths: ballistics, hit volumes, move validation. No React / store imports.
export const G = 9.8
export const MAP_HALF = 75
export const MIN_SHIP_GAP = 4
export const FUEL_REGEN = 0.5 // fraction of max fuel regained at the start of each turn
export const SUBMERGE_DEPTH = 0.9

// `length` is the target hull length in world units (GLB is auto-scaled to it).
export const SHIP_STATS = {
  battleship: { health: 100, armor: 20, maxFuel: 14, length: 9 },
  destroyer: { health: 100, armor: 8, maxFuel: 24, length: 6 },
  submarine: { health: 100, armor: 12, maxFuel: 18, length: 5 },
}

export const WEAPONS = {
  shell: { label: 'Gun', speed: { battleship: 30, destroyer: 26 }, power: { battleship: 45, destroyer: 25 } },
  depthcharge: { label: 'Depth charge', speed: { destroyer: 18 }, power: { destroyer: 55 }, radius: 4.5 },
  torpedo: { label: 'Torpedo', speed: { submarine: 28 }, power: { submarine: 60 }, range: 90 },
}
export const weaponsFor = (type) =>
  type === 'battleship' ? ['shell'] : type === 'destroyer' ? ['shell', 'depthcharge'] : ['torpedo']
export const weaponSpeed = (w, ship) => WEAPONS[w].speed[ship.type]
export const weaponPower = (w, ship) => WEAPONS[w].power[ship.type]
export const damageFor = (power, armor) => Math.max(5, power - armor)

export const TORPEDO_Y = -0.3

// World yaw convention: 0 = toward -z, positive = counter-clockwise (to the left).
export const forward = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)]
export const bearingTo = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[2] - from[2]))
export const dist2D = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2])
export const toDeg = (r) => (r * 180) / Math.PI
export const toRad = (d) => (d * Math.PI) / 180
export const compassDeg = (yaw) => (((Math.round(-toDeg(yaw) * 10) / 10) % 360) + 360) % 360

export function muzzle(ship, yaw, weapon) {
  const [fx, fz] = forward(yaw)
  const off = weapon === 'torpedo' ? ship.length * 0.5 : ship.length * 0.15
  const y = weapon === 'torpedo' ? TORPEDO_Y : ship.length * 0.4
  return [ship.position[0] + fx * off, y, ship.position[2] + fz * off]
}

// Projectile motion exactly as specified: x = v t cos(th), y = y0 + v t sin(th) - g t^2 / 2
export function ballisticPoint(p, t) {
  const x = p.speed * t * Math.cos(p.theta)
  const y = p.origin[1] + p.speed * t * Math.sin(p.theta) - 0.5 * G * t * t
  return [p.origin[0] + p.dir[0] * x, y, p.origin[2] + p.dir[1] * x]
}

// Horizontal distance at which a shot launched at height y0 reaches height yt (on the way down).
export function landingRange(v, theta, y0, yt) {
  const vy = v * Math.sin(theta)
  const t = (vy + Math.sqrt(vy * vy + 2 * G * (y0 - yt))) / G
  return v * Math.cos(theta) * t
}
export function solveElevation(v, range, y0, yt) {
  let best = { deg: 45, error: Infinity }
  for (let d = 5; d <= 70; d += 0.25) {
    const error = Math.abs(landingRange(v, toRad(d), y0, yt) - range)
    if (error < 0.5) return { deg: d, error } // lowest arc that lands on target
    if (error < best.error) best = { deg: d, error }
  }
  return best
}

// Axis-aligned box in the ship's local frame (so "AABB" rotates with the hull).
export function shipBox(ship) {
  const L = ship.length
  const half = [L * 0.17, 0, L / 2]
  return ship.submerged
    ? { half, minY: -2.2, maxY: -0.2 }
    : { half, minY: -1, maxY: ship.type === 'submarine' ? L * 0.3 : L * 0.6 }
}
export function pointInShip(p, ship) {
  const dx = p[0] - ship.position[0]
  const dz = p[2] - ship.position[2]
  const th = ship.rotation[1]
  const lx = dx * Math.cos(th) - dz * Math.sin(th)
  const lz = dx * Math.sin(th) + dz * Math.cos(th)
  const b = shipBox(ship)
  return Math.abs(lx) <= b.half[0] && Math.abs(lz) <= b.half[2] && p[1] >= b.minY && p[1] <= b.maxY
}

export const isAlive = (s) => s.health > 0 && !s.sunk

export function validTargets(ship, ships, weapon) {
  return ships
    .filter((s) => s.team !== ship.team && isAlive(s) && (weapon !== 'shell' || !s.submerged))
    .sort((a, b) => dist2D(ship.position, a.position) - dist2D(ship.position, b.position))
}

export function validMove(ship, x, z, ships) {
  const d = Math.hypot(x - ship.position[0], z - ship.position[2])
  if (d < 0.5 || d > ship.fuel + 1e-6) return false
  if (Math.abs(x) > MAP_HALF || Math.abs(z) > MAP_HALF) return false
  return ships.every((s) => s.id === ship.id || !isAlive(s) || Math.hypot(x - s.position[0], z - s.position[2]) >= MIN_SHIP_GAP)
}

// ---------- AI planning (pure; the controller executes the plans) ----------
const gauss = () => Math.random() + Math.random() + Math.random() - 1.5 // roughly +/-1.5

function primaryWeapon(ship, ships) {
  if (ship.type === 'submarine') return 'torpedo'
  if (ship.type === 'destroyer') {
    const sub = validTargets(ship, ships, 'depthcharge').find((s) => s.type === 'submarine' && s.submerged)
    if (sub && dist2D(ship.position, sub.position) < 45) return 'depthcharge'
  }
  return 'shell'
}

export function aiShouldDive(ship, ships) {
  if (ship.type !== 'submarine' || ship.submerged || ship.fuel < 6) return false
  return validTargets(ship, ships, 'shell').some((s) => s.type !== 'submarine' && dist2D(ship.position, s.position) < 45)
}

export function aiPlanMove(ship, ships) {
  const weapon = primaryWeapon(ship, ships)
  const target = validTargets(ship, ships, weapon)[0]
  if (!target) return null
  const D = dist2D(ship.position, target.position)
  const desired = weapon === 'depthcharge' ? 22 : ship.type === 'submarine' ? 45 : ship.type === 'destroyer' ? 42 : 50
  if (D <= desired) return null
  const ux = (target.position[0] - ship.position[0]) / D
  const uz = (target.position[2] - ship.position[2]) / D
  for (let f = 1; f > 0.2; f -= 0.2) {
    const m = Math.min(ship.fuel, D - desired) * f
    const x = ship.position[0] + ux * m
    const z = ship.position[2] + uz * m
    if (validMove(ship, x, z, ships)) return [x, z]
  }
  return null
}

export function aiPlanShot(ship, ships) {
  const weapon = primaryWeapon(ship, ships)
  const target = validTargets(ship, ships, weapon)[0]
  if (!target) return null
  const aimYaw = bearingTo(ship.position, target.position)
  const origin = muzzle(ship, aimYaw, weapon)
  const D = Math.hypot(target.position[0] - origin[0], target.position[2] - origin[2])
  if (weapon === 'torpedo') {
    if (D > WEAPONS.torpedo.range) return null
    return { weapon, bearing: aimYaw + toRad(gauss() * 0.7), elevation: 0 }
  }
  const v = weaponSpeed(weapon, ship)
  const yt = weapon === 'depthcharge' ? 0 : target.length * 0.25
  const sol = solveElevation(v, D, origin[1], yt)
  if (sol.error > 3) return null // out of reach
  return { weapon, bearing: aimYaw + toRad(gauss() * 0.9), elevation: Math.min(70, Math.max(5, sol.deg + gauss() * 0.6)) }
}
