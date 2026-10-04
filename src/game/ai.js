import { useGame } from './store'
import { aiPlanMove, aiPlanShot, aiShouldDive, isAlive } from './combat'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const get = () => useGame.getState()

async function until(cond, timeout = 15000) {
  const t0 = performance.now()
  while (!cond() && performance.now() - t0 < timeout) await sleep(80)
}

// Plays one full enemy turn. `alive()` lets the caller cancel (restart / unmount).
export async function runEnemyTurn(alive) {
  await sleep(1500)
  while (alive()) {
    const s = get()
    if (s.winner || s.activeTeam !== 'enemy') return
    const ship = s.ships.find((x) => x.team === 'enemy' && isAlive(x) && !x.hasActedThisTurn)
    if (!ship) return get().endTurn()

    get().selectShip(ship.id)
    await sleep(900)
    if (!alive()) return

    let cur = get().ships.find((x) => x.id === ship.id)
    if (aiShouldDive(cur, get().ships)) {
      get().toggleDive()
      await sleep(500)
      cur = get().ships.find((x) => x.id === ship.id)
    }

    const dest = aiPlanMove(cur, get().ships)
    if (dest) {
      get().moveSelected(dest[0], dest[1])
      await until(() => get().phase !== 'MOVEMENT_PHASE' || !alive())
    } else {
      get().enterCombat()
    }
    if (!alive()) return
    await sleep(600)

    const shot = aiPlanShot(get().ships.find((x) => x.id === ship.id), get().ships)
    if (!shot) {
      get().holdFire()
      await sleep(400)
      continue
    }
    get().setAimExact(shot.bearing, shot.elevation, shot.weapon)
    await sleep(1100)
    if (!alive()) return
    get().fire()
    await until(() => get().phase !== 'PROJECTILE_CAM' || !alive())
    await sleep(500)
  }
}
