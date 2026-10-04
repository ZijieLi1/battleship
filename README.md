# Pacific Fleet Commander

Turn-based 3D naval strategy in the browser. React + `@react-three/fiber` + drei, Zustand state machine, Tailwind HUD.

```
npm install
npm run dev      # http://localhost:5173
npm run build
```

## How to play
Pick a fleet size (1–5 per side) and **Player vs AI** or **local hotseat**.

Each turn, every ship may act once: **select → move → aim & fire**.

| Phase | What happens |
| --- | --- |
| `SELECT_SHIP` | Click a friendly ship that hasn't acted. Top-down tactical camera. |
| `MOVEMENT_PHASE` | A ring shows your range (= remaining fuel). Click the ocean inside it to sail there; fuel is spent by distance. Subs can **Dive** (costs half the remaining fuel; surfacing is free). |
| `COMBAT_PHASE` | Camera drops behind the guns. `←/→` bearing, `↑/↓` elevation (hold `Shift` for fine control), `T` cycles target, `Space` fires. |
| `PROJECTILE_CAM` | Camera chases the shell/torpedo to impact. |
| `END_TURN` | When all ships have acted (or you press *End turn*) control passes to the other side. Fuel regenerates by 50 % of max each turn. |

### Combat (no RNG)
* Shells follow `x = v·t·cosθ`, `y = y0 + v·t·sinθ − ½·g·t²` (g = 9.8). Range on flat water ≈ `v²·sin2θ / g`; the HUD shows muzzle velocity, elevation and range to the current target so you can do the sums.
* Torpedoes (submarines) run dead straight at water level; only bearing is adjustable.
* Hit = projectile inside the target's hull-aligned bounding box. Damage = `AttackPower − Armor` (min 5). A shell reaching `y ≤ 0` first is a miss and makes a geyser.
* Submerged subs can't be hit by surface artillery — only by torpedoes or destroyer **depth charges** (explode on entering water, 4.5 radius).

| Class | Armor | Max fuel | Weapon (speed / power) |
| --- | --- | --- | --- |
| Battleship | 20 | 14 | Gun 30 / 45 |
| Destroyer | 8 | 24 | Gun 26 / 25 · Depth charge 18 / 55 |
| Submarine | 12 | 18 | Torpedo 28 / 60, range 90 |

## Layout
* `src/game/combat.js` – pure maths (ballistics, hit boxes, move validation, AI planning)
* `src/game/store.js` – Zustand state machine · `ai.js` – enemy turn driver
* `src/game/fx.js`, `audio.js` – particle pool and sound
* `src/components/` – scene (Ocean, Ship, CameraRig, Simulation…) and HUD
* `tools/gen-audio.mjs` – synthesises `public/audio/*.wav`

See `ASSETS.md` for asset sources. Dev console: `__game` exposes the store.
