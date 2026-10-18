'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useId, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { loanableDefs, outLoans } from '@/lib/loans'
import { rectStyle, UMBRELLA_STAND } from '@/lib/scene'
import { Modal } from '@/components/ui/modal'

/** Punto interactivo sobre la cesta de paraguas dibujada en la escena: quién se lo llevó, quién lo devolvió. */
export function UmbrellaPanel() {
  const { state, dispatch } = useGame()
  const [open, setOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const cardId = useId()
  // Solo cuentan los paraguas definidos; sin préstamo registrado = en casa.
  const out = outLoans(state.loans).filter((loan) => loanableDefs.some((def) => def.id === loan.id))
  const rows = loanableDefs.map((def) => ({ def, loan: state.loans.find((entry) => entry.id === def.id) }))
  const home = rows.length - out.length
  const summary = out.length === 0 ? 'Paraguas: todos en casa' : `Paraguas: ${home} en casa, ${out.length} fuera`
  const showCard = peek && !open

  return (
    <>
      {/* El área interactiva es el paragüero + la tarjeta: mientras el cursor o el foco estén en cualquiera de los dos, la tarjeta sigue visible. */}
      <div
        className="absolute z-30"
        style={rectStyle(UMBRELLA_STAND)}
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        onFocus={() => setPeek(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPeek(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setPeek(false)
        }}
      >
        <button
          type="button"
          aria-label={`${summary}. Abrir para anotar quién se lleva o devuelve un paraguas`}
          aria-describedby={showCard ? cardId : undefined}
          onClick={() => {
            setPeek(false)
            setOpen(true)
          }}
          className="absolute inset-0 cursor-pointer rounded-xl outline-none transition hover:bg-white/10 hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-amber-200/80"
        >
          <span
            aria-hidden
            className="absolute left-1/2 top-1 size-2.5 -translate-x-1/2 rounded-full ring-2 ring-black/40"
            style={{ backgroundColor: out.length === 0 ? 'var(--hud-ok)' : 'var(--hud-warn)', boxShadow: `0 0 8px ${out.length === 0 ? 'var(--hud-ok)' : 'var(--hud-warn)'}` }}
          />
        </button>

        <AnimatePresence>
          {showCard && (
            // A la derecha del paragüero, alineada con su parte superior: queda lejos del mural (post-it de Historial y
            // calendario) y de los controles superiores. Los porcentajes son relativos al paragüero (7,05 % × 44 % de la
            // escena): 325 % de ancho termina en el 98,3 % de la escena y 104 % de alto en su borde inferior, así que en
            // pantallas estrechas se encoge y, si hiciera falta, desplaza la lista en vez de salirse. El pl-2 es un
            // puente transparente para que el cursor no "caiga" al pasar del paragüero a la tarjeta.
            <motion.div
              key="umbrella-card"
              className="absolute left-full top-0 flex max-h-[104%] w-[min(16rem,325%)] pl-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <div id={cardId} role="tooltip" className="glass min-w-0 flex-1 overflow-y-auto rounded-xl p-3 text-hud-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                <p className="text-[0.6rem] font-medium uppercase tracking-wide text-hud-muted">Paragüero · clic para anotar</p>
                <p className="font-serif text-sm leading-tight">
                  {home} en casa · {out.length} fuera
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  {rows.map(({ def, loan }) => {
                    const isOut = loan?.status === 'out'
                    return (
                      <li key={def.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden className={isOut ? 'size-1.5 shrink-0 rounded-full bg-hud-warn' : 'size-1.5 shrink-0 rounded-full bg-hud-ok'} />
                          {def.name}
                        </span>
                        <span className={isOut ? 'text-right text-hud-warn' : 'text-right text-hud-muted'}>
                          {isOut ? (loan?.takenBy ? `Fuera · se lo llevó ${loan.takenBy}` : 'Fuera') : 'En casa'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
