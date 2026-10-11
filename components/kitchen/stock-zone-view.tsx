'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { type ReactNode, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { Plus } from 'lucide-react'
import { articlesOf, shelves } from '@/lib/catalog'
import { levelColor, levelLabel, type StockZone } from '@/lib/inventory'
import { summarizeShelf } from '@/lib/lots'
import { rectStyle, SCENE_IMAGE, ZOOM_META, type Point, type Placement, type ZoomView } from '@/lib/scene'
import { RegisterPanel } from './register-panel'
import { ZoomShell } from './zoom-shell'

type StockZoneViewProps = {
  view: ZoomView
  zone: StockZone
  /** fondo desenfocado (cocina por defecto) */
  backdrop?: string
  /** capas extra sobre la ilustración (p. ej. las canastas de ropa) */
  extras?: ReactNode
  src: string
  /** width / height of the interior illustration */
  ratio: number
  glow: string
  origin: Point
}

export function StockZoneView({ extras, backdrop = SCENE_IMAGE, view, zone, src, ratio, glow, origin }: StockZoneViewProps) {
  const { state } = useGame()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const all = shelves.filter((item) => item.zone === zone)
  const items = all.filter((item) => !item.id.startsWith('otros-'))
  const others = all.find((item) => item.id.startsWith('otros-'))
  const selected = all.find((item) => item.id === selectedId) ?? null
  const meta = ZOOM_META[view]

  return (
    <ZoomShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      origin={origin}
      background={
        <img src={backdrop} alt="" className="absolute inset-0 size-full scale-110 blur-xl brightness-[0.35]" draggable={false} />
      }
    >
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative h-[94%] overflow-visible rounded-md shadow-[0_0_80px_rgba(0,0,0,0.6)]"
          style={{ aspectRatio: ratio }}
        >
          <img src={src} alt={meta.title} className="absolute inset-0 size-full rounded-md" draggable={false} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-md"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${glow}, transparent 65%)`, mixBlendMode: 'screen', opacity: 0.35 }}
          />

          {items
            .filter((item) => item.image)
            .map((item) => (
              <img key={`${item.id}-img`} src={item.image} alt="" className="pointer-events-none absolute z-10 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)]" style={rectStyle(item.rect)} draggable={false} />
            ))}

          {items.map((item) => {
            const placement: Placement = item.rect.x + item.rect.w / 2 < 50 ? 'right' : 'left'
            const isSelected = item.id === selectedId
            const level = summarizeShelf(item, state.lots, state.today).level
            return (
              <button
                key={item.id}
                type="button"
                data-popover-trigger
                aria-label={`${item.name}: ${levelLabel(level)}`}
                aria-expanded={isSelected}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                className="group absolute z-20 cursor-pointer rounded-lg outline-none ring-white/0 transition hover:bg-white/10 hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-amber-200/80 data-[open=true]:ring-2 data-[open=true]:ring-amber-200/80"
                data-open={isSelected}
                style={rectStyle(item.rect)}
              >
                <span
                  aria-hidden
                  className="absolute left-1 top-1 size-2.5 rounded-full ring-2 ring-black/40"
                  style={{ backgroundColor: levelColor(level), boxShadow: `0 0 8px ${levelColor(level)}` }}
                />
                <span className="glass pointer-events-none absolute -top-2 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md px-2 py-0.5 text-[0.7rem] text-hud-foreground group-hover:block">
                  {item.name}
                </span>
              </button>
            )
          })}

          {others && (
            <button
              type="button"
              data-popover-trigger
              aria-expanded={selectedId === others.id}
              onClick={() => setSelectedId(selectedId === others.id ? null : others.id)}
              // Esquina superior derecha: la izquierda ya la ocupan "Volver" y el nombre de la zona (ver ZoomShell).
              className="glass absolute right-[2%] top-[1.5%] z-20 flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-[0.7rem] text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/70"
            >
              <span className="grid size-5 place-items-center rounded-full bg-amber-200/90 text-stone-900">
                <Plus aria-hidden className="size-3" />
              </span>
              {others.name}
              {articlesOf(others.id).length > 0 && <span className="tabular-nums text-hud-muted">· {articlesOf(others.id).length}</span>}
            </button>
          )}

          {extras}

          <AnimatePresence>
            {selected && <RegisterPanel key={selected.id} shelf={selected} placement={selected.rect.x + selected.rect.w / 2 < 50 ? 'right' : 'left'} onClose={() => setSelectedId(null)} />}
          </AnimatePresence>
        </div>
      </div>
    </ZoomShell>
  )
}
