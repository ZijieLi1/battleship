import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Clone, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../game/store'

// Kenney Pirate Kit (CC0). Player = navy-coloured hulls, enemy = pirate hulls.
const MODEL = {
  player: {
    battleship: '/models/ship-large.glb',
    destroyer: '/models/ship-small.glb',
  },
  enemy: {
    battleship: '/models/ship-pirate-large.glb',
    destroyer: '/models/ship-pirate-small.glb',
  },
}
Object.values(MODEL).forEach((t) => Object.values(t).forEach((u) => useGLTF.preload(u)))

// Auto-fit a loaded model to a target hull length and sit it on the waterline.
function FittedModel({ url, length }) {
  const { scene } = useGLTF(url)
  const ref = useRef()
  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const s = length / Math.max(size.x, size.z)
    const centre = box.getCenter(new THREE.Vector3())
    ref.current.scale.setScalar(s)
    ref.current.position.set(-centre.x * s, -box.min.y * s - 0.15, -centre.z * s)
  }, [scene, length])
  return (
    <group ref={ref}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  )
}

// No CC0 submarine was reachable, so subs are built from primitives for now.
function Submarine({ length, team }) {
  const hull = team === 'player' ? '#3c5a78' : '#6b2f2f'
  return (
    <group position-y={0.1}>
      <mesh rotation-x={Math.PI / 2} scale={[1, 1, 1]} castShadow>
        <capsuleGeometry args={[length * 0.11, length * 0.75, 8, 20]} />
        <meshStandardMaterial color={hull} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, length * 0.14, length * 0.05]} castShadow>
        <boxGeometry args={[length * 0.1, length * 0.14, length * 0.22]} />
        <meshStandardMaterial color={hull} roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  )
}

export default function Ship({ ship }) {
  const group = useRef()
  const selected = useGame((s) => s.selectedId === ship.id)
  const select = useGame((s) => s.select)
  const t = useRef(Math.random() * 10)

  // Light bobbing so ships sit in the swell.
  useFrame((_, dt) => {
    t.current += dt
    group.current.position.y = Math.sin(t.current * 1.1) * 0.06
    group.current.rotation.z = Math.sin(t.current * 0.8) * 0.015
  })

  const url = MODEL[ship.team][ship.type]

  return (
    <group position={ship.position} rotation={ship.rotation}>
      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation()
          if (ship.team === 'player') select(ship.id)
        }}
      >
        {url ? (
          <FittedModel url={url} length={ship.length} />
        ) : (
          <Submarine length={ship.length} team={ship.team} />
        )}
      </group>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[ship.length * 0.75, ship.length * 0.82, 64]} />
          <meshBasicMaterial color="#38e8ff" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
