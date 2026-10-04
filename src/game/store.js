import { create } from 'zustand'
import {
  FUEL_REGEN, SHIP_STATS, SUBMERGE_DEPTH, bearingTo, damageFor, dist2D, forward, isAlive,
  muzzle, toRad, validMove, validTargets, weaponPower, weaponSpeed, weaponsFor,
} from './combat'
import { fx } from './fx'
import { audio } from './audio'

// Phases: SELECT_SHIP -> MOVEMENT_PHASE -> COMBAT_PHASE -> PROJECTILE_CAM -> (END_TURN) -> ...
const TYPES = ['battleship', 'destroyer', 'submarine', 'battleship', 'destroyer']
const FINISH_DELAY = 1800
let uid = 0
let token = 0 // bumped on restart so stale timers are ignored

export function makeFleet(size) {
  const ships = []
  for (let i = 0; i < size; i++) {
    const x = (i - (size - 1) / 2) * 13
    for (const team of ['player', 'enemy']) {
      const type = TYPES[i]
      const sign = team === 'player' ? 1 : -1
      ships.push({
        id: `${team[0]}${i + 1}`,
        team,
        type,
        ...SHIP_STATS[type],
        health: SHIP_STATS[type].health,
        fuel: SHIP_STATS[type].maxFuel,
        hasActedThisTurn: false,
        submerged: false,
        sunk: false,
        moveTarget: null,
        position: [x * sign, 0, 30 * sign],
        rotation: [0, team === 'player' ? 0 : Math.PI, 0],
      })
    }
  }
  return ships
}

const fresh = (size, mode) => ({
  mode,
  fleetSize: size,
  ships: makeFleet(size),
  activeTeam: 'player',
  selectedId: 'p1',
  phase: 'SELECT_SHIP',
  aim: { bearing: 0, elevation: 25, weapon: 'shell', targetId: null },
  projectiles: [],
  impact: null,
  winner: null,
  banner: null,
  turn: 1,
})

export const useGame = create((set, get) => {
  const selected = () => get().ships.find((s) => s.id === get().selectedId)
  const patchShip = (id, patch) =>
    set((s) => ({ ships: s.ships.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) }))
  const flash = (text, ms = 1800) => {
    const t = token
    set({ banner: text })
    setTimeout(() => token === t && get().banner === text && set({ banner: null }), ms)
  }
  const humanTurn = () => get().mode === 'hotseat' || get().activeTeam === 'player'

  function retarget(weapon) {
    const ship = selected()
    const target = validTargets(ship, get().ships, weapon)[0]
    set((s) => ({
      aim: {
        ...s.aim,
        weapon,
        targetId: target?.id ?? null,
        bearing: target ? bearingTo(ship.position, target.position) : ship.rotation[1],
        elevation: weapon === 'torpedo' ? 0 : weapon === 'depthcharge' ? 30 : 25,
      },
    }))
  }

  function checkEnd() {
    const { ships, activeTeam } = get()
    const alive = (t) => ships.filter((s) => s.team === t && isAlive(s)).length
    if (!alive('player') || !alive('enemy')) {
      set({ winner: alive('player') ? 'player' : 'enemy', phase: 'GAME_OVER' })
      return true
    }
    if (ships.filter((s) => s.team === activeTeam && isAlive(s)).every((s) => s.hasActedThisTurn)) {
      get().endTurn()
      return true
    }
    return false
  }

  return {
    ...fresh(3, 'ai'),
    started: false,

    startGame: (mode, size) => {
      token++
      set({ ...fresh(size, mode), started: true })
      flash(mode === 'ai' ? 'Your turn' : 'Blue fleet — your turn')
    },
    toMenu: () => {
      token++
      set({ ...fresh(3, 'ai'), started: false })
    },

    // SELECT_SHIP -> MOVEMENT_PHASE
    selectShip: (id) => {
      const s = get()
      const ship = s.ships.find((x) => x.id === id)
      const ok = ship && ship.team === s.activeTeam && isAlive(ship) && !ship.hasActedThisTurn && !ship.moveTarget
      if (!ok || (s.phase !== 'SELECT_SHIP' && s.phase !== 'MOVEMENT_PHASE')) return
      set({ selectedId: id, phase: 'MOVEMENT_PHASE' })
    },

    moveSelected: (x, z) => {
      const s = get()
      const ship = selected()
      if (s.phase !== 'MOVEMENT_PHASE' || ship.moveTarget || !validMove(ship, x, z, s.ships)) return
      const d = Math.hypot(x - ship.position[0], z - ship.position[2])
      patchShip(ship.id, { moveTarget: [x, z], fuel: ship.fuel - d })
    },
    // Called by the sim when the ship reaches its destination.
    arrive: (id) => {
      patchShip(id, { moveTarget: null })
      get().enterCombat()
    },

    toggleDive: () => {
      const ship = selected()
      if (get().phase !== 'MOVEMENT_PHASE' || ship.type !== 'submarine' || ship.moveTarget) return
      // Diving burns half of the remaining fuel; surfacing is free.
      patchShip(ship.id, ship.submerged ? { submerged: false } : { submerged: true, fuel: ship.fuel / 2 })
    },

    // MOVEMENT_PHASE -> COMBAT_PHASE
    enterCombat: () => {
      const ship = selected()
      if (!ship || ship.moveTarget) return
      set({ phase: 'COMBAT_PHASE' })
      retarget(weaponsFor(ship.type)[0])
    },
    setWeapon: (w) => {
      if (get().phase === 'COMBAT_PHASE' && weaponsFor(selected().type).includes(w)) retarget(w)
    },
    cycleTarget: () => {
      const s = get()
      const ship = selected()
      const list = validTargets(ship, s.ships, s.aim.weapon)
      if (s.phase !== 'COMBAT_PHASE' || !list.length) return
      const next = list[(list.findIndex((t) => t.id === s.aim.targetId) + 1) % list.length]
      set({ aim: { ...s.aim, targetId: next.id, bearing: bearingTo(ship.position, next.position) } })
    },
    setAim: (dBearing, dElevation) => {
      const s = get()
      if (s.phase !== 'COMBAT_PHASE') return
      const elevation = s.aim.weapon === 'torpedo' ? 0 : Math.min(70, Math.max(5, s.aim.elevation + dElevation))
      set({ aim: { ...s.aim, bearing: s.aim.bearing + dBearing, elevation } })
    },
    // For the AI: set an exact solution.
    setAimExact: (bearing, elevation, weapon) => {
      retarget(weapon)
      set((s) => ({ aim: { ...s.aim, bearing, elevation } }))
    },

    // COMBAT_PHASE -> PROJECTILE_CAM
    fire: () => {
      const s = get()
      if (s.phase !== 'COMBAT_PHASE') return
      const ship = selected()
      const { bearing, elevation, weapon } = s.aim
      const dir = forward(bearing)
      const origin = muzzle(ship, bearing, weapon)
      const p = {
        id: ++uid, kind: weapon, ownerId: ship.id, team: ship.team, origin, dir,
        speed: weaponSpeed(weapon, ship), power: weaponPower(weapon, ship),
        theta: weapon === 'torpedo' ? 0 : toRad(elevation), t: 0, pos: [...origin], done: false,
      }
      if (weapon === 'torpedo') audio.play('torpedo', 0.8)
      else {
        audio.play('cannon', 0.9)
        fx.muzzle(origin, dir)
      }
      set({ projectiles: [p], phase: 'PROJECTILE_CAM' })
    },

    // Called by the sim when a projectile ends. res: {type:'hit'|'splash'|'fizzle', point, shipId?}
    resolveProjectile: (p, res) => {
      if (p.done) return
      p.done = true
      const t = token
      let msg = 'Miss'
      if (res.type === 'hit') {
        const target = get().ships.find((s) => s.id === res.shipId)
        const dmg = damageFor(p.power, target.armor)
        const health = Math.max(0, target.health - dmg)
        const sinking = health <= 0
        patchShip(target.id, sinking ? { health, sunk: true, sunkAt: performance.now(), moveTarget: null } : { health })
        fx.explosion(res.point, sinking ? 2.2 : 1)
        if (p.kind !== 'shell') fx.splash(res.point, 0.9)
        audio.play('explosion', 1)
        msg = sinking ? `${target.type} sunk!` : `Hit! −${dmg}`
      } else if (res.type === 'splash') {
        fx.splash(res.point, p.kind === 'depthcharge' ? 1.3 : 1)
        audio.play('splash', 0.9)
      } else {
        fx.splash(res.point, 0.5)
      }
      flash(msg, 1500)
      set({ impact: { pos: res.point } })
      setTimeout(() => token === t && get().finishAction(), FINISH_DELAY)
    },

    // End of the ship's action (after a shot or a "hold fire").
    finishAction: () => {
      const id = get().selectedId
      set((s) => ({
        ships: s.ships.map((sh) => (sh.id === id ? { ...sh, hasActedThisTurn: true } : sh)),
        projectiles: [],
        impact: null,
        phase: 'SELECT_SHIP',
      }))
      checkEnd()
    },
    holdFire: () => {
      const s = get()
      if (s.phase === 'MOVEMENT_PHASE' || s.phase === 'COMBAT_PHASE') {
        if (selected().moveTarget) return
        get().finishAction()
      }
    },

    // END_TURN
    endTurn: () => {
      const s = get()
      if (s.winner || s.phase === 'PROJECTILE_CAM' || selected()?.moveTarget) return
      const next = s.activeTeam === 'player' ? 'enemy' : 'player'
      const ships = s.ships.map((sh) =>
        sh.team === next && isAlive(sh)
          ? { ...sh, hasActedThisTurn: false, fuel: Math.min(sh.maxFuel, sh.fuel + sh.maxFuel * FUEL_REGEN) }
          : sh,
      )
      const first = ships.find((sh) => sh.team === next && isAlive(sh))
      set({
        ships, activeTeam: next, selectedId: first.id, phase: 'SELECT_SHIP', impact: null, projectiles: [],
        turn: next === 'player' ? s.turn + 1 : s.turn,
      })
      flash(s.mode === 'ai' ? (next === 'player' ? 'Your turn' : 'Enemy turn') : next === 'player' ? 'Blue fleet — your turn' : 'Red fleet — your turn')
    },

    // Used by sim/AI helpers
    humanTurn,
    SUBMERGE_DEPTH,
    dist2D,
  }
})
