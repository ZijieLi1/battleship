import { useState } from 'react'
import { Anchor, Bot, Users } from 'lucide-react'
import { useGame } from '../game/store'
import { audio } from '../game/audio'

export default function Screens() {
  const { started, winner, mode, startGame, toMenu, fleetSize } = useGame()
  const [size, setSize] = useState(3)

  if (!started) {
    const go = (m) => {
      audio.preload()
      startGame(m, size)
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
        <div className="w-[26rem] rounded-2xl bg-slate-900/90 p-8 text-center text-slate-100 shadow-2xl">
          <Anchor className="mx-auto mb-2 text-cyan-300" size={34} />
          <h1 className="text-3xl font-extrabold tracking-tight">Pacific Fleet Commander</h1>
          <p className="mt-1 mb-6 text-sm text-slate-400">Turn-based naval artillery. No dice — just maths and nerve.</p>
          <div className="mb-1 text-xs tracking-widest text-slate-400 uppercase">Fleet size</div>
          <div className="mb-6 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setSize(n)}
                className={`h-10 w-10 rounded-lg font-bold ${size === n ? 'bg-cyan-600' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => go('ai')} className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 py-3 font-semibold hover:bg-cyan-500">
              <Bot size={18} /> Player vs AI
            </button>
            <button onClick={() => go('hotseat')} className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 py-3 font-semibold hover:bg-slate-600">
              <Users size={18} /> Local hotseat (2 players)
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (winner) {
    const text = mode === 'ai' ? (winner === 'player' ? 'Victory!' : 'Defeat') : winner === 'player' ? 'Blue fleet wins!' : 'Red fleet wins!'
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm">
        <div className="rounded-2xl bg-slate-900/90 p-8 text-center text-slate-100 shadow-2xl">
          <div className="mb-4 text-4xl font-extrabold">{text}</div>
          <div className="flex gap-2">
            <button onClick={() => startGame(mode, fleetSize)} className="rounded-lg bg-cyan-600 px-5 py-2 font-semibold hover:bg-cyan-500">Rematch</button>
            <button onClick={toMenu} className="rounded-lg bg-slate-700 px-5 py-2 font-semibold hover:bg-slate-600">Menu</button>
          </div>
        </div>
      </div>
    )
  }
  return null
}
