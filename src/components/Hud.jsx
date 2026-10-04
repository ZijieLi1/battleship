import { Crosshair, Map as MapIcon } from 'lucide-react'
import { useGame } from '../game/store'

export default function Hud() {
  const { ships, selectedId, cameraMode, toggleCameraMode, activeTeam } = useGame()
  const ship = ships.find((s) => s.id === selectedId)
  const count = (team) => ships.filter((s) => s.team === team && s.health > 0).length

  return (
    <div className="pointer-events-none absolute inset-0 text-slate-100 select-none">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900/70 px-5 py-2 text-center backdrop-blur">
        <div className="text-xs tracking-widest text-cyan-300 uppercase">
          {activeTeam === 'player' ? 'Your turn' : 'Enemy turn'}
        </div>
        <div className="text-xl font-bold">
          {count('player')} v {count('enemy')}
        </div>
      </div>

      {ship && (
        <div className="absolute bottom-3 left-3 w-60 rounded-lg bg-slate-900/70 p-3 backdrop-blur">
          <div className="mb-2 text-sm font-semibold capitalize">{ship.type}</div>
          <Bar label="Health" value={ship.health} max={100} color="bg-emerald-400" />
          <Bar label="Fuel" value={ship.fuel} max={20} color="bg-amber-400" />
        </div>
      )}

      <div className="pointer-events-auto absolute right-3 bottom-3 flex flex-col items-end gap-2">
        <button
          onClick={toggleCameraMode}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 font-semibold hover:bg-cyan-500"
        >
          {cameraMode === 'tactical' ? <Crosshair size={18} /> : <MapIcon size={18} />}
          {cameraMode === 'tactical' ? 'Combat view' : 'Tactical view'}
          <kbd className="rounded bg-black/30 px-1.5 text-xs">C</kbd>
        </button>
        <div className="rounded bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
          Click a friendly ship to select it
        </div>
      </div>
    </div>
  )
}

function Bar({ label, value, max, color }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-700">
        <div className={`h-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}
