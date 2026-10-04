import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../game/store'
import { input } from '../game/input'
import { fx } from '../game/fx'
import {
  TORPEDO_Y, WEAPONS, MAP_HALF, ballisticPoint, dist2D, isAlive, pointInShip, toRad,
} from '../game/combat'

const SHIP_SPEED = 10
const TURN_RATE = 4
const STEP = 1 / 120
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Shift: 'fine' }

const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

// Keyboard controls + the per-frame game simulation (movement and projectiles).
export default function Simulation() {
  useEffect(() => {
    const down = (e) => {
      const s = useGame.getState()
      if (KEYS[e.key]) {
        input[KEYS[e.key]] = true
        if (e.key.startsWith('Arrow')) e.preventDefault()
      }
      if (!s.humanTurn()) return
      if (e.code === 'Space') {
        e.preventDefault()
        s.fire()
      } else if (e.key === 't' || e.key === 'T') s.cycleTarget()
    }
    const up = (e) => KEYS[e.key] && (input[KEYS[e.key]] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = useGame.getState()
    if (!s.started) return

    // --- aiming input (human turns only) ---
    if (s.phase === 'COMBAT_PHASE' && s.humanTurn()) {
      const k = input.fine ? 0.2 : 1
      const db = (input.left - input.right) * toRad(30) * k * dt
      const de = (input.up - input.down) * 14 * k * dt
      if (db || de) s.setAim(db, de)
    }

    // --- ship movement ---
    for (const ship of s.ships) {
      if (!ship.moveTarget) continue
      const [tx, tz] = ship.moveTarget
      const dx = tx - ship.position[0]
      const dz = tz - ship.position[2]
      const d = Math.hypot(dx, dz)
      const want = Math.atan2(-dx, -dz)
      const diff = angleDiff(want, ship.rotation[1])
      ship.rotation[1] += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE * dt)
      const step = Math.min(d, SHIP_SPEED * dt * Math.max(0, Math.cos(diff)))
      if (d - step < 0.05) {
        ship.position[0] = tx
        ship.position[2] = tz
        s.arrive(ship.id)
      } else {
        ship.position[0] += (dx / d) * step
        ship.position[2] += (dz / d) * step
        if (!ship.submerged) fx.wake([ship.position[0], 0, ship.position[2]])
        else fx.bubbles([ship.position[0], -0.6, ship.position[2]])
      }
    }

    // --- projectiles ---
    for (const p of s.projectiles) {
      if (p.done) continue
      const steps = Math.max(1, Math.ceil(dt / STEP))
      const h = dt / steps
      for (let i = 0; i < steps && !p.done; i++) {
        p.t += h
        if (p.kind === 'torpedo') {
          const r = p.speed * p.t
          p.pos = [p.origin[0] + p.dir[0] * r, TORPEDO_Y, p.origin[2] + p.dir[1] * r]
        } else p.pos = ballisticPoint(p, p.t)

        const enemies = s.ships.filter((x) => x.team !== p.team && isAlive(x))

        if (p.kind === 'depthcharge') {
          // Depth charges ignore hulls; they detonate on entering the water.
          if (p.pos[1] <= 0) {
            const sub = enemies
              .filter((x) => x.type === 'submarine' && dist2D(x.position, p.pos) <= WEAPONS.depthcharge.radius)
              .sort((a, b) => dist2D(a.position, p.pos) - dist2D(b.position, p.pos))[0]
            s.resolveProjectile(p, sub ? { type: 'hit', shipId: sub.id, point: [p.pos[0], -0.5, p.pos[2]] } : { type: 'splash', point: [p.pos[0], 0, p.pos[2]] })
          }
          continue
        }

        // Surface artillery can't touch submerged boats; torpedoes can hit anything.
        const hit = enemies.find((x) => (p.kind === 'torpedo' || !x.submerged) && pointInShip(p.pos, x))
        if (hit) {
          s.resolveProjectile(p, { type: 'hit', shipId: hit.id, point: [...p.pos] })
        } else if (p.kind === 'shell' && p.pos[1] <= 0) {
          s.resolveProjectile(p, { type: 'splash', point: [p.pos[0], 0, p.pos[2]] })
        } else if (p.kind === 'torpedo' && (p.speed * p.t >= WEAPONS.torpedo.range || Math.abs(p.pos[0]) > MAP_HALF + 20 || Math.abs(p.pos[2]) > MAP_HALF + 20)) {
          s.resolveProjectile(p, { type: 'fizzle', point: [p.pos[0], 0, p.pos[2]] })
        }
      }
      if (p.kind === 'torpedo' && !p.done) fx.wake([p.pos[0], 0, p.pos[2]])
    }
  })

  return null
}
