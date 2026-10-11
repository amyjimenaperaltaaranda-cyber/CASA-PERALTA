'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { useDismiss } from '@/hooks/use-dismiss'
import { HAMPER_LEVELS, type Hamper, type HamperDef, hamperDefs, hamperStatus } from '@/lib/hampers'
import { rectStyle } from '@/lib/scene'

const TONE = { ok: 'var(--hud-ok)', soon: 'var(--hud-warn)', urgent: 'var(--hud-danger)' } as const

/** Las tres canastas de ropa sucia sobre la ilustración del gabinete: nivel a la vista y panel para registrarlo. */
export function HamperLayer() {
  const { state } = useGame()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      {hamperDefs.map((def) => {
        const hamper = state.hampers.find((entry) => entry.id === def.id)
        if (!hamper) return null
        const status = hamperStatus(hamper, state.today)
        const isOpen = openId === def.id
        return (
          <button
            key={def.id}
            type="button"
            data-popover-trigger
            aria-label={`Canasta de ${def.name}: ${status.label}`}
            aria-expanded={isOpen}
            onClick={() => setOpenId(isOpen ? null : def.id)}
            className="group absolute z-20 cursor-pointer rounded-lg outline-none ring-white/0 transition hover:bg-white/10 hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-amber-200/80 data-[open=true]:ring-2 data-[open=true]:ring-amber-200/80"
            data-open={isOpen}
            style={rectStyle(def.rect)}
          >
            {status.tone === 'urgent' && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-lg"
                style={{ boxShadow: `0 0 0 2px ${TONE.urgent}, 0 0 22px ${TONE.urgent}` }}
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {/* medidor vertical de llenura */}
            <span aria-hidden className="absolute bottom-1.5 right-1.5 top-1.5 w-1.5 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/25">
              <span className="absolute inset-x-0 bottom-0 rounded-full" style={{ height: `${Math.max(hamper.level, 4)}%`, backgroundColor: TONE[status.tone] }} />
            </span>
            <span className="glass pointer-events-none absolute -top-2 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] text-hud-foreground group-hover:block">
              Ropa sucia · {def.name}
            </span>
          </button>
        )
      })}
      <AnimatePresence>{openId && <HamperPanel key={openId} def={hamperDefs.find((entry) => entry.id === openId) as HamperDef} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </>
  )
}

function HamperPanel({ def, onClose }: { def: HamperDef; onClose: () => void }) {
  const { state, dispatch } = useGame()
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose)
  const hamper = state.hampers.find((entry) => entry.id === def.id) as Hamper
  const status = hamperStatus(hamper, state.today)
  const center = Math.min(74, Math.max(26, def.rect.x + def.rect.w / 2))

  return (
    <div ref={ref} className="absolute z-[70] w-[17rem]" style={{ left: `${center}%`, top: `${def.rect.y + def.rect.h + 2}%`, transform: 'translateX(-50%)' }}>
      <motion.div
        role="dialog"
        aria-label={`Ropa sucia de ${def.name}`}
        initial={{ opacity: 0, scale: 0.9, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="glass rounded-xl p-3 text-hud-foreground"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-hud-muted">Ropa sucia</p>
            <p className="font-serif text-lg leading-tight">Canasta de {def.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="-mr-1 -mt-1 grid size-6 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
            <X className="size-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${hamper.level}%`, backgroundColor: TONE[status.tone] }} />
          </div>
          <span className="text-[0.7rem]" style={{ color: TONE[status.tone] }}>
            {status.label}
          </span>
        </div>
        <p className="mt-1 text-[0.68rem] leading-snug text-hud-muted">{status.detail}</p>

        <p className="mb-1 mt-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">¿Cuánto tiene ahora?</p>
        <div className="flex flex-wrap gap-1">
          {HAMPER_LEVELS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={hamper.level === option.value}
              onClick={() => {
                dispatch({ type: 'hamper', id: def.id, level: option.value })
                onClose()
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs ring-1 transition active:scale-95 ${hamper.level === option.value ? 'bg-amber-200/25 ring-amber-200/60' : 'bg-white/10 ring-white/15 hover:bg-white/20'}`}
            >
              {option.label}
              {option.hint ? <span className="ml-1 text-hud-muted">· {option.hint}</span> : null}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
