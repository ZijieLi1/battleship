import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import Ocean from './components/Ocean'
import Ship from './components/Ship'
import CameraRig from './components/CameraRig'
import Hud from './components/Hud'
import Screens from './components/Screens'
import Particles from './components/Particles'
import Simulation from './components/Simulation'
import Projectiles from './components/Projectiles'
import BattleField from './components/BattleField'
import { useGame } from './game/store'
import { runEnemyTurn } from './game/ai'

// Drives the enemy whenever it is the AI's turn.
function useEnemyAI() {
  const started = useGame((s) => s.started)
  const mode = useGame((s) => s.mode)
  const team = useGame((s) => s.activeTeam)
  const winner = useGame((s) => s.winner)
  const turn = useGame((s) => s.turn)
  useEffect(() => {
    if (!started || mode !== 'ai' || team !== 'enemy' || winner) return
    let live = true
    runEnemyTurn(() => live)
    return () => { live = false }
  }, [started, mode, team, winner, turn])
}

export default function App() {
  const ships = useGame((s) => s.ships)
  useEnemyAI()
  return (
    <div className="relative h-full w-full">
      <Canvas shadows camera={{ fov: 50, near: 0.5, far: 1500 }}>
        <color attach="background" args={['#9cc4e0']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[40, 60, -50]} intensity={2.2} castShadow />
        <Sky sunPosition={[40, 45, -70]} turbidity={6} rayleigh={1.2} />
        <Suspense fallback={null}>
          <Ocean />
          {ships.map((s) => (
            <Ship key={s.id} ship={s} />
          ))}
        </Suspense>
        <Projectiles />
        <BattleField />
        <Particles />
        <Simulation />
        <CameraRig />
      </Canvas>
      <Hud />
      <Screens />
    </div>
  )
}
