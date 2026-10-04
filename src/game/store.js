import { create } from 'zustand'

// Ship classes. `length` is the target hull length in world units; the GLB is
// auto-scaled to it. Stats are placeholders until the combat step.
export const SHIP_STATS = {
  battleship: { health: 100, armor: 20, fuel: 12, length: 9, attackPower: 45 },
  destroyer: { health: 100, armor: 8, fuel: 20, length: 6, attackPower: 25 },
  submarine: { health: 100, armor: 12, fuel: 16, length: 5, attackPower: 60 },
}

const make = (id, team, type, x, z) => ({
  id,
  team,
  type,
  ...SHIP_STATS[type],
  hasActedThisTurn: false,
  position: [x, 0, z],
  // Player fleet sails toward -z, enemy toward +z.
  rotation: [0, team === 'player' ? 0 : Math.PI, 0],
})

const initialShips = [
  make('p1', 'player', 'battleship', -12, 24),
  make('p2', 'player', 'destroyer', 0, 24),
  make('p3', 'player', 'submarine', 12, 24),
  make('e1', 'enemy', 'battleship', 12, -24),
  make('e2', 'enemy', 'destroyer', 0, -24),
  make('e3', 'enemy', 'submarine', -12, -24),
]

export const useGame = create((set) => ({
  ships: initialShips,
  activeTeam: 'player',
  selectedId: 'p1',
  cameraMode: 'tactical', // 'tactical' | 'combat'
  select: (id) => set({ selectedId: id }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'tactical' ? 'combat' : 'tactical' })),
}))
