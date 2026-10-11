'use client'

import { motion } from 'framer-motion'
import { History, Pencil, Plus, RotateCcw, Shirt, SquareCheck, Trash2, Umbrella, Utensils, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { Modal } from '@/components/ui/modal'
import { articleById, articleName, formatAmount } from '@/lib/catalog'
import { hamperDef } from '@/lib/hampers'
import { loanableDef } from '@/lib/loans'
import type { HistoryEntry, MovementKind } from '@/lib/lots'
import { type Rect, rectStyle } from '@/lib/scene'

const KIND: Record<MovementKind, { label: string; icon: typeof Plus; tone: string }> = {
  create: { label: 'Producto nuevo', icon: Plus, tone: 'text-hud-ok' },
  buy: { label: 'Creado', icon: Plus, tone: 'text-hud-ok' },
  edit: { label: 'Editado', icon: Pencil, tone: 'text-hud-warn' },
  delete: { label: 'Borrado', icon: Trash2, tone: 'text-hud-danger' },
  restore: { label: 'Restaurado', icon: RotateCcw, tone: 'text-hud-ok' },
  use: { label: 'Uso', icon: Utensils, tone: 'text-hud-muted' },
  check: { label: 'Revisión', icon: SquareCheck, tone: 'text-hud-muted' },
  finish: { label: 'Agotado', icon: SquareCheck, tone: 'text-hud-danger' },
  discard: { label: 'Descartado', icon: Trash2, tone: 'text-hud-danger' },
  hamper: { label: 'Ropa sucia', icon: Shirt, tone: 'text-hud-muted' },
  loan: { label: 'Paraguas', icon: Umbrella, tone: 'text-hud-muted' },
}

const FILTERS = [
  { id: 'all', label: 'Todo', kinds: null },
  { id: 'create', label: 'Creados', kinds: ['create', 'buy', 'restore'] },
  { id: 'edit', label: 'Editados', kinds: ['edit'] },
  { id: 'delete', label: 'Borrados', kinds: ['delete'] },
  { id: 'use', label: 'Uso y revisión', kinds: ['use', 'check', 'finish', 'discard', 'hamper', 'loan'] },
] as const

function nameOf(entry: HistoryEntry) {
  if (entry.articleId.startsWith('hamper:')) return `Canasta de ${hamperDef(entry.articleId.slice(7))?.name ?? entry.articleId.slice(7)}`
  if (entry.articleId.startsWith('loan:')) return loanableDef(entry.articleId.slice(5))?.name ?? entry.articleId.slice(5)
  return articleName(entry.articleId)
}

function detailOf(entry: HistoryEntry) {
  if (entry.detail) return entry.detail
  const article = articleById(entry.articleId)
  if (!article) return ''
  switch (entry.kind) {
    case 'buy':
      return `Compra de ${formatAmount(article, entry.amount)}`
    case 'use':
      return `Usó ${formatAmount(article, entry.amount)}`
    case 'check':
      return `Quedan ~${formatAmount(article, entry.amount)}`
    case 'finish':
      return 'Lote agotado'
    case 'discard':
      return 'Se malogró'
    default:
      return ''
  }
}

const TZ = 'America/Lima'
const dayOf = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: TZ })
function whenLabel(iso: string, now: Date) {
  const date = new Date(iso)
  const time = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
  if (dayOf(date) === dayOf(now)) return `hoy ${time}`
  return `${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '')} ${time}`
}

/** Post-it pegado en la refri: abre el historial unificado de movimientos (crear, editar, borrar, uso...). */
export function HistoryPostIt({ rect }: { rect: Rect }) {
  const { state } = useGame()
  const [open, setOpen] = useState(false)
  const todayCount = state.history.filter((entry) => dayOf(new Date(entry.at)) === dayOf(new Date())).length

  return (
    <>
      <motion.button
        type="button"
        data-popover-trigger
        aria-label="Abrir el historial de movimientos"
        onClick={() => setOpen((value) => !value)}
        className="absolute z-30 flex cursor-pointer flex-col items-center justify-center gap-[6%] bg-amber-200 text-stone-800 shadow-[0_6px_12px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{ ...rectStyle(rect), rotate: 3 }}
        whileHover={{ scale: 1.12, rotate: 0 }}
        whileTap={{ scale: 0.96 }}
      >
        <span aria-hidden className="absolute -top-[6%] left-1/2 h-[14%] w-[55%] -translate-x-1/2 rotate-[3deg] bg-white/60 shadow-sm" />
        <History aria-hidden className="size-[42%]" />
        <span className="text-[max(0.5rem,0.6vw)] font-medium leading-none">Historial</span>
        {todayCount > 0 && (
          <span aria-label={`${todayCount} movimientos hoy`} className="absolute -right-[12%] -top-[10%] grid min-w-[1.1rem] place-items-center rounded-full bg-stone-800 px-1 text-[0.6rem] font-semibold tabular-nums text-amber-100">
            {todayCount}
          </span>
        )}
      </motion.button>
      {open && <HistoryPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function HistoryPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const now = new Date()
  const kinds = FILTERS.find((entry) => entry.id === filter)?.kinds ?? null
  const entries = useMemo(() => state.history.filter((entry) => !kinds || (kinds as readonly string[]).includes(entry.kind)), [state.history, kinds])
  const trashed = new Set(state.trash.map((lot) => lot.id))
  const live = new Set(state.lots.map((lot) => lot.id))
  const archivedIds = new Set(state.archivedProducts.map((product) => product.id))

  return (
    <Modal label="Historial de movimientos" onClose={onClose} maxWidth="max-w-[34rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-hud-muted">Todos los movimientos</p>
            <h2 className="font-serif text-2xl leading-tight">Historial</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-[0.7rem] leading-snug text-hud-muted">Nada se borra de verdad: los lotes borrados se guardan y se pueden restaurar desde aquí.</p>

        <div className="mt-3 flex flex-wrap gap-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={filter === entry.id}
              onClick={() => setFilter(entry.id)}
              className={`rounded-lg px-2.5 py-1 text-xs ring-1 transition ${filter === entry.id ? 'bg-amber-200/25 ring-amber-200/60' : 'bg-white/10 ring-white/15 hover:bg-white/20'}`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <p className="mt-6 pb-4 text-center text-sm text-hud-muted">Aún no hay movimientos en esta vista.</p>
        ) : (
          <ul className="mt-3 flex-1 divide-y divide-white/10 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const kind = KIND[entry.kind]
              const Icon = kind.icon
              const canRestoreLot = entry.kind === 'delete' && entry.lotId !== '' && trashed.has(entry.lotId) && !live.has(entry.lotId)
              const canRestoreProduct = entry.kind === 'delete' && entry.lotId === '' && archivedIds.has(entry.articleId)
              const canRestore = canRestoreLot || canRestoreProduct
              return (
                <li key={entry.id} className="flex items-start gap-2.5 py-2">
                  <span aria-hidden className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/10 ${kind.tone}`}>
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight">
                      <span className={`font-medium ${kind.tone}`}>{kind.label}</span> · {nameOf(entry)}
                    </p>
                    {detailOf(entry) && <p className="text-[0.72rem] leading-snug text-hud-muted">{detailOf(entry)}</p>}
                    <p className="mt-0.5 text-[0.66rem] text-hud-muted">
                      {entry.by || 'Alguien'} · {whenLabel(entry.at, now)}
                    </p>
                  </div>
                  {canRestore && (
                    <button
                      type="button"
                      onClick={() => dispatch(canRestoreProduct ? { type: 'restoreProduct', id: entry.articleId } : { type: 'restore', lotId: entry.lotId })}
                      className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[0.7rem] ring-1 ring-white/15 transition hover:bg-amber-200/25 hover:ring-amber-200/60"
                    >
                      Restaurar
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
    </Modal>
  )
}
