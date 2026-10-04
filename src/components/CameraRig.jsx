import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../game/store'

const _pos = new THREE.Vector3()
const _look = new THREE.Vector3()
const _fwd = new THREE.Vector3()

// Smoothly blends between Tactical (top-down) and Combat (over-the-shoulder).
export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const lookAt = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useEffect(() => {
    camera.position.set(0, 70, 40)
    const onKey = (e) => {
      if (e.key === 'c' || e.key === 'C') useGame.getState().toggleCameraMode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])

  useFrame((_, dt) => {
    const { ships, selectedId, cameraMode } = useGame.getState()
    const ship = ships.find((s) => s.id === selectedId)
    if (!ship) return
    const k = 1 - Math.exp(-3 * dt) // frame-rate independent smoothing

    if (cameraMode === 'tactical') {
      // High angle, slightly tilted so the horizon stays out of frame.
      _pos.set(ship.position[0], 62, ship.position[2] + 26)
      _look.set(ship.position[0], 0, ship.position[2] - 4)
    } else {
      // Behind the guns, looking toward the nearest enemy.
      const me = new THREE.Vector3(...ship.position)
      const foe = ships
        .filter((s) => s.team !== ship.team)
        .map((s) => new THREE.Vector3(...s.position))
        .sort((a, b) => a.distanceTo(me) - b.distanceTo(me))[0]
      _fwd.copy(foe ?? new THREE.Vector3(0, 0, -1)).sub(me).setY(0).normalize()
      _pos.copy(me).addScaledVector(_fwd, -(ship.length * 1.5)).setY(ship.length * 0.9 + 3)
      _look.copy(me).addScaledVector(_fwd, 60).setY(1)
    }

    camera.position.lerp(_pos, k)
    lookAt.lerp(_look, k)
    camera.lookAt(lookAt)
  })

  return null
}
