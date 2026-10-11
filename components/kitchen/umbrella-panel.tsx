'use client'

import { useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { loanableDefs, outLoans } from '@/lib/loans'
import { rectStyle, UMBRELLA_STAND } from '@/lib/scene'
import { Modal } from '@/components/ui/modal'

/** Punto interactivo sobre la cesta de paraguas dibujada en la escena: quién se lo llevó, quién lo devolvió. */
export function UmbrellaPanel() {
  const { state, dispatch } = useGame()
  const [open, setOpen] = useState(false)
  const out = outLoans(state.loans)

  return (
    <>
      <button
        type="button"
        aria-label={out.length === 0 ? 'Paraguas: todos en casa' : `Paraguas: ${out.length} afuera`}
        onClick={() => setOpen(true)}
        className="group absolute z-20 cursor-pointer rounded-xl outline-none transition hover:bg-white/10 hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-amber-200/80"
        style={rectStyle(UMBRELLA_STAND)}
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-1 size-2.5 -translate-x-1/2 rounded-full ring-2 ring-black/40"
          style={{ backgroundColor: out.length === 0 ? 'var(--hud-ok)' : 'var(--hud-warn)', boxShadow: `0 0 8px ${out.length === 0 ? 'var(--hud-ok)' : 'var(--hud-warn)'}` }}
        />
        <span className="glass pointer-events-none absolute -top-2 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] text-hud-foreground group-hover:block">
          {out.length === 0 ? 'Paraguas: todos en casa' : `${out.length} paraguas afuera`}
        </span>
      </button>

      {open && (
        <Modal label="Paraguas" onClose={() => setOpen(false)}>
          <h2 className="font-serif text-lg">Paraguas</h2>
          <p className="mt-0.5 text-xs text-hud-muted">
            Como {state.player?.name ?? 'quien entró'}: marca el paraguas que te llevas o el que devuelves.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {state.loans.map((loan) => {
              const def = loanableDefs.find((entry) => entry.id === loan.id)
              if (!def) return null
              return (
                <li key={loan.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
                  <div>
                    <p className="text-sm">{def.name}</p>
                    <span className={`text-[0.65rem] font-medium uppercase tracking-wide ${loan.status === 'out' ? 'text-hud-warn' : 'text-hud-ok'}`}>
                      {loan.status === 'out' ? `Afuera · se lo llevó ${loan.takenBy}` : 'En casa'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'loan', id: loan.id, action: loan.status === 'out' ? 'return' : 'take' })}
                    className="shrink-0 rounded-full bg-amber-200/25 px-3 py-1.5 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35"
                  >
                    {loan.status === 'out' ? 'Lo devuelvo' : 'Me lo llevo'}
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" onClick={() => setOpen(false)} className="mt-3 self-start rounded-lg bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15 transition hover:bg-white/20">
            Cerrar
          </button>
        </Modal>
      )}
    </>
  )
}
