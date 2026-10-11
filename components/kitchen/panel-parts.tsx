import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

export function Chip({ children, onClick, active = false }: { children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-2.5 py-1.5 text-xs ring-1 transition active:scale-95 ${active ? 'bg-amber-200/25 ring-amber-200/60' : 'bg-white/10 ring-white/15 hover:bg-white/20'}`}
    >
      {children}
    </button>
  )
}

export function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(1, value - 1))} className="grid size-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">
        <Minus className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm tabular-nums">{value}</span>
      <button type="button" aria-label="Más" onClick={() => onChange(value + 1)} className="grid size-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95">
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export const fieldClass = 'w-full rounded-lg bg-white/10 px-2 py-1.5 text-xs text-hud-foreground outline-none ring-1 ring-white/15 focus:ring-amber-200/70 [color-scheme:dark]'
