import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Anchor, Crosshair, Flame, Fuel, Flag, Rocket,
  SkipForward, Target, Volume2, VolumeX, Waves, Shield,
} from 'lucide-react'
import { useState } from 'react'
import { useGame } from '../game/store'
import { input } from '../game/input'
import { audio } from '../game/audio'
import { WEAPONS, compassDeg, dist2D, isAlive, toDeg, weaponSpeed, weaponsFor } from '../game/combat'

const PHASE_LABEL = {
  SELECT_SHIP: 'Select a ship',
  MOVEMENT_PHASE: 'Movement',
  COMBAT_PHASE: 'Combat',
  PROJECTILE_CAM: 'Projectile in flight',
  GAME_OVER: 'Battle over',
}

function Btn({ children, onClick, disabled, tone = 'slate', className = '' }) {
  const tones = {
    slate: 'bg-slate-700 hover:bg-slate-600',
    cyan: 'bg-cyan-600 hover:bg-cyan-500',
    red: 'bg-red-600 hover:bg-red-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
  }
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

// Press-and-hold button feeding the same input state as the arrow keys.
function HoldKey({ k, children }) {
  const set = (v) => () => (input[k] = v)
  return (
    <button
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerLeave={set(false)}
      onPointerCancel={set(false)}
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-cyan-600"
    >
      {children}
    </button>
  )
}

// Line-art "wireframe" silhouettes for the active-ship panel.
function Wireframe({ type, team }) {
  const c = team === 'player' ? '#5eead4' : '#fca5a5'
  const shapes = {
    battleship: 'M4 30 L16 40 H104 L116 28 L100 28 L100 20 L84 20 L84 12 L70 12 L70 6 L60 6 L60 12 L46 12 L46 20 L28 20 L28 28 Z M30 28 V20 M44 28 V20 M20 28 H100',
    destroyer: 'M6 32 L18 40 H98 L112 30 L92 30 L92 22 L72 22 L72 14 L60 14 L60 22 L40 22 L40 30 Z M50 22 V8 M30 30 H92',
    submarine: 'M6 30 Q10 22 28 22 H92 Q112 22 114 30 Q112 38 92 38 H28 Q10 38 6 30 Z M58 22 V12 H72 V22 M72 16 H80',
  }
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-28">
      <path d={shapes[type]} fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function Bar({ icon: Icon, label, value, max, color }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-1"><Icon size={12} />{label}</span>
        <span>{Math.round(value)} / {max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-700">
        <div className={`h-full transition-all ${color}`} style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
      </div>
    </div>
  )
}

export default function Hud() {
  const s = useGame()
  const [muted, setMuted] = useState(false)
  if (!s.started) return null

  const ship = s.ships.find((x) => x.id === s.selectedId)
  const count = (team) => s.ships.filter((x) => x.team === team && isAlive(x)).length
  const human = s.humanTurn()
  const teamName = s.mode === 'ai' ? (s.activeTeam === 'player' ? 'Your turn' : 'Enemy turn') : s.activeTeam === 'player' ? 'Blue fleet' : 'Red fleet'
  const target = s.ships.find((x) => x.id === s.aim.targetId)
  const range = target && ship ? dist2D(ship.position, target.position) : null
  const inCombat = s.phase === 'COMBAT_PHASE'
  const canEnd = human && ['SELECT_SHIP', 'MOVEMENT_PHASE', 'COMBAT_PHASE'].includes(s.phase) && !ship?.moveTarget
  const weapons = ship ? weaponsFor(ship.type) : []
  const left = s.ships.filter((x) => x.team === s.activeTeam && isAlive(x) && !x.hasActedThisTurn).length

  return (
    <div className="pointer-events-none absolute inset-0 text-slate-100 select-none">
      {/* Top centre: turn + ship counter */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900/75 px-6 py-2 text-center backdrop-blur">
        <div className={`text-xs font-semibold tracking-widest uppercase ${s.activeTeam === 'player' ? 'text-cyan-300' : 'text-red-300'}`}>
          {teamName} · turn {s.turn}
        </div>
        <div className="text-2xl font-bold">
          <span className="text-teal-300">{count('player')}</span> v <span className="text-red-300">{count('enemy')}</span>
        </div>
        <div className="text-[11px] text-slate-400">{PHASE_LABEL[s.phase]} · {left} ship{left === 1 ? '' : 's'} ready</div>
      </div>

      <button
        onClick={() => { audio.muted = !audio.muted; setMuted(audio.muted) }}
        className="pointer-events-auto absolute top-3 right-3 rounded-lg bg-slate-900/75 p-2 hover:bg-slate-800"
        aria-label="Toggle sound"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="absolute top-3 left-3 rounded-lg bg-slate-900/60 px-3 py-2 text-[11px] leading-5 text-slate-300">
        <b>Move:</b> click ship → click ocean<br />
        <b>Aim:</b> ←/→ bearing · ↑/↓ elevation · Shift = fine<br />
        <b>Fire:</b> Space · <b>Target:</b> T
      </div>

      {s.banner && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 rounded-xl bg-slate-900/80 px-8 py-3 text-3xl font-bold tracking-wide capitalize shadow-lg backdrop-blur">
          {s.banner}
        </div>
      )}

      {/* Crosshair with elevation readout */}
      {inCombat && human && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg width="90" height="90" viewBox="-45 -45 90 90" className="text-cyan-200">
            <circle r="26" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
            <path d="M-40 0H-12M12 0H40M0 -40V-12M0 12V40" stroke="currentColor" strokeWidth="1.5" />
            <circle r="1.5" fill="currentColor" />
          </svg>
          <div className="absolute top-1/2 left-[96px] -translate-y-1/2 font-mono text-lg font-bold whitespace-nowrap text-cyan-200 drop-shadow">
            {s.aim.weapon === 'torpedo' ? 'LOCKED 0.0°' : `${s.aim.elevation.toFixed(1)}°`}
          </div>
        </div>
      )}

      {/* Bottom left: active ship */}
      {ship && (
        <div className="absolute bottom-3 left-3 w-64 rounded-lg bg-slate-900/75 p-3 backdrop-blur">
          <div className="mb-1 flex items-center justify-between">
            <Wireframe type={ship.type} team={ship.team} />
            <div className="text-right">
              <div className="text-sm font-semibold capitalize">{ship.type}</div>
              <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400">
                <Shield size={11} /> armor {ship.armor}
              </div>
              {ship.submerged && <div className="text-[11px] font-semibold text-sky-300">SUBMERGED</div>}
              {ship.hasActedThisTurn && <div className="text-[11px] text-slate-400">acted</div>}
            </div>
          </div>
          <Bar icon={Flame} label="Health" value={ship.health} max={100} color={ship.health < 50 ? 'bg-orange-400' : 'bg-emerald-400'} />
          <Bar icon={Fuel} label="Fuel" value={ship.fuel} max={ship.maxFuel} color="bg-amber-400" />
        </div>
      )}

      {/* Bottom right: controls */}
      <div className="pointer-events-auto absolute right-3 bottom-3 flex w-72 flex-col gap-2 rounded-lg bg-slate-900/75 p-3 backdrop-blur">
        {!human && <div className="py-2 text-center text-sm text-red-200">Enemy fleet is manoeuvring…</div>}

        {human && s.phase === 'SELECT_SHIP' && (
          <div className="text-sm text-slate-300">Click one of your ships that hasn't acted yet.</div>
        )}

        {human && s.phase === 'MOVEMENT_PHASE' && ship && (
          <>
            <div className="text-sm text-slate-300">
              {ship.moveTarget ? 'Underway…' : 'Click inside the ring to move, or skip to combat.'}
            </div>
            {ship.type === 'submarine' && (
              <Btn tone="amber" disabled={!!ship.moveTarget} onClick={s.toggleDive}>
                <Waves size={16} /> {ship.submerged ? 'Surface (free)' : 'Dive (−½ fuel)'}
              </Btn>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Btn tone="cyan" disabled={!!ship.moveTarget} onClick={s.enterCombat}><Crosshair size={16} /> To combat</Btn>
              <Btn disabled={!!ship.moveTarget} onClick={s.holdFire}><SkipForward size={16} /> Skip ship</Btn>
            </div>
          </>
        )}

        {human && inCombat && ship && (
          <>
            {weapons.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                {weapons.map((w) => (
                  <Btn key={w} tone={s.aim.weapon === w ? 'cyan' : 'slate'} onClick={() => s.setWeapon(w)}>{WEAPONS[w].label}</Btn>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-1 rounded bg-black/30 p-2 text-center font-mono text-xs">
              <div><div className="text-slate-400">BEARING</div><div className="text-base text-cyan-200">{compassDeg(s.aim.bearing).toFixed(1)}°</div></div>
              <div><div className="text-slate-400">ELEV</div><div className="text-base text-cyan-200">{s.aim.weapon === 'torpedo' ? '—' : `${s.aim.elevation.toFixed(1)}°`}</div></div>
              <div><div className="text-slate-400">VELOCITY</div><div className="text-base text-cyan-200">{weaponSpeed(s.aim.weapon, ship)}</div></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1 capitalize"><Target size={12} />{target ? `${target.type}${target.submerged ? ' (sub.)' : ''}` : 'no target'}</span>
              <span className="font-mono">{range ? `range ${range.toFixed(1)}` : ''} · g 9.8</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-3 gap-1">
                <span /><HoldKey k="up"><ArrowUp size={16} /></HoldKey><span />
                <HoldKey k="left"><ArrowLeft size={16} /></HoldKey>
                <HoldKey k="down"><ArrowDown size={16} /></HoldKey>
                <HoldKey k="right"><ArrowRight size={16} /></HoldKey>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Btn tone="red" onClick={s.fire} className="py-3 text-base">
                  {s.aim.weapon === 'torpedo' ? <Rocket size={18} /> : <Flame size={18} />} FIRE
                </Btn>
                <div className="grid grid-cols-2 gap-1">
                  <Btn onClick={s.cycleTarget} className="text-xs">Next target</Btn>
                  <Btn onClick={s.holdFire} className="text-xs">Hold fire</Btn>
                </div>
              </div>
            </div>
          </>
        )}

        {s.phase === 'PROJECTILE_CAM' && <div className="py-2 text-center text-sm text-slate-300">Tracking projectile…</div>}

        {canEnd && (
          <Btn tone="amber" onClick={s.endTurn}><Flag size={16} /> End turn</Btn>
        )}
      </div>
    </div>
  )
}
