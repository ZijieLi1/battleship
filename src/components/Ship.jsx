import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Clone, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { SUBMERGE_DEPTH, toRad } from '../game/combat'
import { fx } from '../game/fx'

// Kenney Pirate Kit (CC0). Player = navy-coloured hulls, enemy = pirate hulls.
const MODEL = {
  player: { battleship: '/models/ship-large.glb', destroyer: '/models/ship-small.glb' },
  enemy: { battleship: '/models/ship-pirate-large.glb', destroyer: '/models/ship-pirate-small.glb' },
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

// No CC0 submarine was reachable, so subs are built from primitives.
function Submarine({ sref }) {
  const { length, team } = sref.current
  const mats = useRef([])
  const hull = team === 'player' ? '#3c5a78' : '#6b2f2f'
  useFrame(() => {
    const sub = sref.current.submerged
    for (const m of mats.current) {
      if (!m) continue
      m.transparent = sub
      m.depthTest = !sub // keep the silhouette visible through the water
      m.opacity = sub ? 0.4 : 1
    }
  })
  const mat = (i) => <meshStandardMaterial ref={(m) => (mats.current[i] = m)} color={hull} roughness={0.5} metalness={0.3} />
  return (
    <group position-y={0.1}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <capsuleGeometry args={[length * 0.11, length * 0.75, 8, 20]} />
        {mat(0)}
      </mesh>
      <mesh position={[0, length * 0.14, length * 0.05]} castShadow>
        <boxGeometry args={[length * 0.1, length * 0.14, length * 0.22]} />
        {mat(1)}
      </mesh>
    </group>
  )
}

// Visible gun barrels that follow the aim (bearing / elevation).
function Guns({ sref }) {
  const yaw = useRef()
  const pitch = useRef()
  const root = useRef()
  useFrame(() => {
    const s = useGame.getState()
    const ship = sref.current
    const show = s.selectedId === ship.id && (s.phase === 'COMBAT_PHASE' || s.phase === 'PROJECTILE_CAM') && s.aim.weapon !== 'torpedo'
    root.current.visible = show
    if (!show) return
    yaw.current.rotation.y = s.aim.bearing - ship.rotation[1]
    pitch.current.rotation.x = toRad(s.aim.elevation)
  })
  const L = sref.current.length
  return (
    <group ref={root} position={[0, L * 0.4, -L * 0.1]}>
      <group ref={yaw}>
        <group ref={pitch}>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x * L * 0.5, 0, -L * 0.17]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[L * 0.018, L * 0.022, L * 0.34, 10]} />
              <meshStandardMaterial color="#2a2d33" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

export default function Ship({ ship }) {
  const sref = useRef(ship)
  sref.current = ship
  const root = useRef()
  const bob = useRef()
  const t = useRef(Math.random() * 10)
  const acc = useRef(0)
  const select = useGame((s) => s.selectShip)
  const selected = useGame((s) => s.selectedId === ship.id)
  const phase = useGame((s) => s.phase)
  const acted = ship.hasActedThisTurn

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const sh = sref.current
    t.current += dt
    root.current.position.set(sh.position[0], 0, sh.position[2])
    root.current.rotation.y = sh.rotation[1]

    let y = Math.sin(t.current * 1.1) * 0.06
    let roll = Math.sin(t.current * 0.8) * 0.015
    const target = sh.submerged ? -SUBMERGE_DEPTH : 0
    bob.current.userData.dep = THREE.MathUtils.damp(bob.current.userData.dep ?? 0, target, 3, dt)
    y += bob.current.userData.dep

    if (sh.sunk) {
      const k = (performance.now() - sh.sunkAt) / 1000
      y -= k * 0.9
      roll += Math.min(k * 0.25, 0.9)
      root.current.visible = k < 5
      if (k < 3) {
        acc.current += dt
        while (acc.current > 0.05) {
          acc.current -= 0.05
          fx.smoke([sh.position[0], sh.length * 0.4, sh.position[2]])
          fx.fire([sh.position[0], sh.length * 0.3, sh.position[2]])
        }
      }
    } else if (sh.health < 50 && !sh.submerged) {
      // Damaged: fire and smoke emitters attached to the hull.
      acc.current += dt
      while (acc.current > 0.06) {
        acc.current -= 0.06
        const f = sh.health < 25 ? 1 : 0.5
        fx.smoke([sh.position[0], sh.length * 0.55, sh.position[2]])
        if (Math.random() < f) fx.fire([sh.position[0], sh.length * 0.3, sh.position[2]])
      }
    }
    bob.current.position.y = y
    bob.current.rotation.z = roll
  })

  const url = MODEL[ship.team][ship.type]
  const canPick = phase === 'SELECT_SHIP' || phase === 'MOVEMENT_PHASE'
  const L = ship.length

  return (
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation()
        const g = useGame.getState()
        if (g.humanTurn()) g.selectShip(ship.id)
      }}
      onPointerOver={() => {
        const g = useGame.getState()
        document.body.style.cursor = canPick && g.humanTurn() && ship.team === g.activeTeam && !acted ? 'pointer' : ''
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <group ref={bob}>
        {url ? <FittedModel url={url} length={L} /> : <Submarine sref={sref} />}
        {ship.type !== 'submarine' && <Guns sref={sref} />}
      </group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[L * 0.75, L * (selected ? 0.82 : 0.78), 64]} />
        <meshBasicMaterial
          color={selected ? '#38e8ff' : ship.team === 'player' ? '#3fe0a0' : '#ff5a4a'}
          transparent
          opacity={ship.sunk ? 0 : selected ? 0.9 : acted ? 0.12 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
