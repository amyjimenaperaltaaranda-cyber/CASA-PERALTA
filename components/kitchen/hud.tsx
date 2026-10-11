'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, MousePointer2 } from 'lucide-react'
import { useGame } from '@/components/game/game-provider'
import { household } from '@/lib/inventory'
import { computeHudStats } from '@/lib/lots'

export function PlayerBadge() {
  const { state, dispatch } = useGame()
  const player = state.player
  if (!player) return null

  return (
    <header className="glass absolute left-[1.5%] top-[2.5%] z-50 flex items-center gap-3 rounded-2xl py-2 pl-2 pr-3 text-hud-foreground">
      <div className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${player.tone} font-serif text-lg text-stone-900`}>
        {player.name.charAt(0)}
      </div>
      <div className="leading-tight">
        <p className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-hud-muted">{player.role}</p>
        <p className="font-serif text-xl">{player.name}</p>
      </div>
      <div className="ml-2 border-l border-white/15 pl-3 leading-tight">
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-hud-muted">Hogar</p>
        <p className="text-xs">{household}</p>
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: 'logout' })}
        aria-label="Salir"
        className="ml-1 grid size-8 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground"
      >
        <LogOut aria-hidden className="size-4" />
      </button>
    </header>
  )
}

export function ActionCaption({ label }: { label: string | null }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[3%] z-50 -translate-x-1/2" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={label ?? 'idle'}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="glass flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-hud-foreground"
        >
          <MousePointer2 aria-hidden className="size-3.5 text-amber-200" />
          {label ?? 'Haz clic en un mueble para acercarte'}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

const statColor = (value: number) =>
  value >= 60 ? 'var(--hud-ok)' : value >= 35 ? 'var(--hud-warn)' : 'var(--hud-danger)'

export function InventoryHud() {
  const { state } = useGame()
  const stats = computeHudStats(state.lots, state.today)

  return (
    <section
      aria-label="Estado del inventario"
      className="glass absolute bottom-[3%] left-[64%] z-50 flex w-[min(62%,44rem)] -translate-x-1/2 items-stretch gap-4 rounded-2xl px-5 py-3 text-hud-foreground"
    >
      {stats.map((stat, index) => (
        <div key={stat.id} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-hud-muted">{stat.label}</span>
            <span className="text-base font-semibold tabular-nums leading-none" style={{ color: statColor(stat.value) }}>
              {stat.value}
              <span className="text-xs text-hud-muted">%</span>
            </span>
          </div>
          <div
            role="meter"
            aria-label={stat.label}
            aria-valuenow={stat.value}
            aria-valuemin={0}
            aria-valuemax={100}
            className="relative h-2 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/10"
          >
            <div className="hud-gradient absolute inset-0 opacity-15" />
            <motion.div
              className="hud-gradient absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundSize: `${(100 / Math.max(stat.value, 1)) * 100}% 100%` }}
              initial={{ width: 0 }}
              animate={{ width: `${stat.value}%` }}
              transition={{ duration: 0.9, delay: 0.2 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/25" />
            </motion.div>
          </div>
          <span className="truncate text-[0.65rem] text-hud-muted">{stat.detail}</span>
        </div>
      ))}
    </section>
  )
}
