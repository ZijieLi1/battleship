import { useState } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { validMove } from '../game/combat'

// Click plane + movement-range overlay for the MOVEMENT_PHASE.
export default function BattleField() {
  const phase = useGame((s) => s.phase)
  const ships = useGame((s) => s.ships)
  const selectedId = useGame((s) => s.selectedId)
  const moveSelected = useGame((s) => s.moveSelected)
  const [hover, setHover] = useState(null)

  const cur = ships.find((s) => s.id === selectedId)
  const active = phase === 'MOVEMENT_PHASE' && cur && !cur.moveTarget && useGame.getState().humanTurn()
  const ok = active && hover && validMove(cur, hover[0], hover[1], ships)

  return (
    <>
      <mesh
        rotation-x={-Math.PI / 2}
        visible={false}
        onPointerMove={(e) => active && setHover([e.point.x, e.point.z])}
        onPointerOut={() => setHover(null)}
        onClick={(e) => ok && (e.stopPropagation(), moveSelected(hover[0], hover[1]))}
      >
        <planeGeometry args={[600, 600]} />
      </mesh>

      {active && (
        <group position={[cur.position[0], 0.05, cur.position[2]]}>
          <mesh rotation-x={-Math.PI / 2} scale={Math.max(cur.fuel, 0.01)}>
            <circleGeometry args={[1, 64]} />
            <meshBasicMaterial color="#38e8ff" transparent opacity={0.12} depthWrite={false} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} scale={Math.max(cur.fuel, 0.01)}>
            <ringGeometry args={[0.985, 1, 96]} />
            <meshBasicMaterial color="#38e8ff" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      {active && hover && (
        <>
          <Line points={[[cur.position[0], 0.1, cur.position[2]], [hover[0], 0.1, hover[1]]]} color={ok ? '#7dffb0' : '#ff6b6b'} lineWidth={2} dashed dashSize={0.8} gapSize={0.5} />
          <mesh rotation-x={-Math.PI / 2} position={[hover[0], 0.1, hover[1]]}>
            <ringGeometry args={[1, 1.3, 32]} />
            <meshBasicMaterial color={ok ? '#7dffb0' : '#ff6b6b'} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </>
  )
}
