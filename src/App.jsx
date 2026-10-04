import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import Ocean from './components/Ocean'
import Ship from './components/Ship'
import CameraRig from './components/CameraRig'
import Hud from './components/Hud'
import { useGame } from './game/store'

export default function App() {
  const ships = useGame((s) => s.ships)
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
        <CameraRig />
      </Canvas>
      <Hud />
    </div>
  )
}
