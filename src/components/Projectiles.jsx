import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGame } from '../game/store'

function Projectile({ p }) {
  const ref = useRef()
  useFrame(() => {
    ref.current.visible = !p.done
    ref.current.position.set(...p.pos)
    // Point along the instantaneous velocity (shells arc; torpedoes stay level).
    if (p.kind !== 'torpedo') {
      const vy = p.speed * Math.sin(p.theta) - 9.8 * p.t
      const vh = p.speed * Math.cos(p.theta)
      ref.current.lookAt(p.pos[0] + p.dir[0] * vh, p.pos[1] + vy, p.pos[2] + p.dir[1] * vh)
    } else ref.current.lookAt(p.pos[0] + p.dir[0], p.pos[1], p.pos[2] + p.dir[1])
  })
  const torpedo = p.kind === 'torpedo'
  return (
    <group ref={ref} position={p.origin}>
      <mesh rotation-x={torpedo ? Math.PI / 2 : 0}>
        {torpedo ? <cylinderGeometry args={[0.18, 0.18, 2.2, 10]} /> : <sphereGeometry args={[p.kind === 'depthcharge' ? 0.4 : 0.28, 12, 12]} />}
        <meshStandardMaterial color={p.kind === 'depthcharge' ? '#556' : '#222'} metalness={0.8} roughness={0.35} emissive="#ff7a00" emissiveIntensity={p.kind === 'shell' ? 0.6 : 0} />
      </mesh>
    </group>
  )
}

export default function Projectiles() {
  const projectiles = useGame((s) => s.projectiles)
  return projectiles.map((p) => <Projectile key={p.id} p={p} />)
}
