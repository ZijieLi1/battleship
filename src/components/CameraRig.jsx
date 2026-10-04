import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { forward, toRad } from '../game/combat'

const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const cur = new THREE.Vector3()

// Phase-driven camera: top-down tactical <-> over-the-shoulder combat <-> projectile chase.
export default function CameraRig() {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    camera.position.set(0, 70, 70)
    cur.set(0, 0, 25)
  }, [camera])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const { ships, selectedId, phase, aim, projectiles, impact } = useGame.getState()
    const ship = ships.find((s) => s.id === selectedId)
    let rate = 3

    if (phase === 'PROJECTILE_CAM') {
      const p = projectiles[0]
      rate = 7
      if (p && !p.done) {
        // Chase from behind and slightly above the round.
        const h = p.kind === 'torpedo' ? 2.5 : 3
        pos.set(p.pos[0] - p.dir[0] * 9, Math.max(p.pos[1], 0) + h, p.pos[2] - p.dir[1] * 9)
        look.set(p.pos[0] + p.dir[0] * 3, p.pos[1], p.pos[2] + p.dir[1] * 3)
      } else if (impact) {
        pos.copy(camera.position)
        look.set(...impact.pos)
      }
    } else if (phase === 'COMBAT_PHASE' && ship) {
      const [fx, fz] = forward(aim.bearing)
      pos.set(ship.position[0] - fx * ship.length * 1.5, ship.length * 0.9 + 3, ship.position[2] - fz * ship.length * 1.5)
      // Pitch the view with gun elevation so the crosshair tracks the barrels.
      look.set(ship.position[0] + fx * 60, 1 + Math.sin(toRad(aim.elevation)) * 12, ship.position[2] + fz * 60)
    } else {
      const c = ship ?? { position: [0, 0, 0] }
      pos.set(c.position[0], 62, c.position[2] + 26)
      look.set(c.position[0], 0, c.position[2] - 4)
    }

    const k = 1 - Math.exp(-rate * dt)
    camera.position.lerp(pos, k)
    cur.lerp(look, k)
    camera.lookAt(cur)
  })

  return null
}
