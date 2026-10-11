'use client'

import { motion } from 'framer-motion'
import { Pencil, Plus, X } from 'lucide-react'
import { type CSSProperties, type ReactNode, useRef, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { useDismiss } from '@/hooks/use-dismiss'
import { type Article, articlesOf, buyAmount, formatAmount, type Shelf } from '@/lib/catalog'
import { durationLabel, formatDay, formatDayShort } from '@/lib/days'
import { levelColor, levelLabel } from '@/lib/inventory'
import { type ArticleSummary, estimate, expiryOf, type Lot, type LotAction, learnedPerKg, summarize } from '@/lib/lots'
import { LotEditor } from './lot-editor'
import { ProductEditor } from './product-editor'
import { Chip, fieldClass, Group, Stepper } from './panel-parts'
import { RIPENESS, RIPENESS_CHOICES } from '@/lib/fruit'
import type { Placement } from '@/lib/scene'

const GAP = '10px'
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const anchor = (shelf: Shelf, placement: Placement): CSSProperties => {
  const { x, y, w, h } = shelf.rect
  const top = `${clamp(y + h / 2, 36, 64)}%`
  return placement === 'right'
    ? { left: `${x + w}%`, top, transform: `translate(${GAP}, -50%)` }
    : { left: `${x}%`, top, transform: `translate(calc(-100% - ${GAP}), -50%)` }
}

const CHECKS = [
  { label: 'Lleno', value: 1 },
  { label: '¾', value: 0.75 },
  { label: '½', value: 0.5 },
  { label: '¼', value: 0.25 },
  { label: 'Casi nada', value: 0.08 },
]
const EXPIRY_CHOICES = [3, 7, 14, 30, 90, 365]
const TONE = { none: 'text-hud-muted', ok: 'text-hud-ok', soon: 'text-hud-warn', expired: 'text-hud-danger' } as const

/** Panel de registro: todo con botones. Usar / revisar cuánto queda / anotar una compra / cerrar un lote. */
type PanelProps = { shelf: Shelf; placement: Placement; onClose: () => void; initialArticleId?: string }

export function RegisterPanel(props: PanelProps) {
  return articlesOf(props.shelf.id).length === 0 ? <EmptyShelfPanel {...props} /> : <FilledPanel {...props} />
}

/** Mueble sin productos todavía (p. ej. "Otros"): invita a agregar el primero. */
function EmptyShelfPanel({ shelf, placement, onClose }: PanelProps) {
  const { dispatch } = useGame()
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose)
  return (
    <div ref={ref} className="absolute z-[70] w-[18.5rem]" style={anchor(shelf, placement)}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }} className="glass rounded-xl p-3 text-hud-foreground">
        <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-hud-muted">{shelf.name}</p>
        <p className="mt-1 text-sm">Aquí aún no hay productos.</p>
        <p className="text-[0.7rem] leading-snug text-hud-muted">Agrega lo que no está en la lista: mostaza, pescado, lo que compres.</p>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: 'openNewProduct', shelfId: shelf.id })
            onClose()
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-200/25 px-3 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35"
        >
          <Plus className="size-4" />
          Agregar producto
        </button>
      </motion.div>
    </div>
  )
}

/** Panel de registro de un mueble con productos. */
function FilledPanel({ shelf, placement, onClose, initialArticleId }: PanelProps) {
  const { state, dispatch } = useGame()
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose)

  const options = articlesOf(shelf.id)
  const [articleId, setArticleId] = useState(options.some((entry) => entry.id === initialArticleId) ? (initialArticleId as string) : options[0].id)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState(false)
  const [tab, setTab] = useState<'use' | 'buy'>('use')
  const article = options.find((entry) => entry.id === articleId) ?? options[0]
  const sum = summarize(article, state.lots, state.today)

  const editing = editingId ? (sum.lots.find((lot) => lot.id === editingId) ?? null) : null

  const act = (action: LotAction) => {
    dispatch(action)
    onClose()
  }

  return (
    <div ref={ref} className="absolute z-[70] w-[18.5rem]" style={anchor(shelf, placement)}>
      <motion.div
        role="dialog"
        aria-label={`Registro de ${article.name}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="glass max-h-[min(30rem,78vh)] overflow-y-auto rounded-xl p-3 text-hud-foreground"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-hud-muted">{shelf.name}</p>
            <p className="font-serif text-lg leading-tight">{article.name}</p>
          </div>
          {article.custom && !editingProduct && (
            <button type="button" onClick={() => setEditingProduct(true)} aria-label="Editar producto" title="Editar nombre o mueble del producto" className="-mt-1 grid size-6 shrink-0 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
              <Pencil className="size-3" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Cerrar" className="-mr-1 -mt-1 grid size-6 shrink-0 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
            <X className="size-3.5" />
          </button>
        </div>

        {(
          <div className="mt-2 flex flex-wrap gap-1">
            {options.map((entry) => {
              const level = summarize(entry, state.lots, state.today).level
              return (
                <Chip
                  key={entry.id}
                  active={entry.id === article.id}
                  onClick={() => {
                    setArticleId(entry.id)
                    setEditingId(null)
                  }}
                >
                  <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full" style={{ backgroundColor: levelColor(level) }} />
                  {entry.name}
                </Chip>
              )
            })}
            <Chip
              onClick={() => {
                dispatch({ type: 'openNewProduct', shelfId: shelf.id })
                onClose()
              }}
            >
              <Plus aria-hidden className="mr-0.5 inline size-3" />
              Producto
            </Chip>
          </div>
        )}

        {editingProduct ? (
          <ProductEditor article={article} onClose={() => setEditingProduct(false)} />
        ) : (
          <>
        <Status article={article} sum={sum} />

        {editing ? (
          <LotEditor key={editing.id} article={article} lot={editing} onClose={onClose} />
        ) : (
          <>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-white/8 p-0.5 text-xs">
          {(['use', 'buy'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-md px-2 py-1.5 transition ${tab === id ? 'bg-white/20 text-hud-foreground' : 'text-hud-muted hover:text-hud-foreground'}`}
            >
              {id === 'use' ? 'Usé / revisé' : 'Compré'}
            </button>
          ))}
        </div>

        {tab === 'use' ? <UseForm article={article} sum={sum} act={act} /> : <BuyForm key={article.id} article={article} lots={state.lots} act={act} />}

        {sum.lots.length > 0 && <LotList article={article} sum={sum} today={state.today} act={act} onEdit={setEditingId} />}
          </>
        )}
          </>
        )}
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ estado */

function Status({ article, sum }: { article: Article; sum: ArticleSummary }) {
  if (sum.lots.length === 0) return <p className="mt-2 text-xs text-hud-muted">Sin stock registrado.</p>
  const days = sum.daysLeft === null ? null : Math.floor(sum.daysLeft)
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${sum.level}%`, backgroundColor: levelColor(sum.level) }} />
        </div>
        <span className="text-[0.7rem] tabular-nums" style={{ color: levelColor(sum.level) }}>
          {levelLabel(sum.level)}
        </span>
      </div>
      <p className="mt-1.5 text-xs">Quedan {formatAmount(article, sum.total)}</p>
      {sum.lots.some((lot) => lot.by === 'Inicio') && <p className="text-[0.68rem] leading-snug text-hud-warn">Valor inicial aproximado: corrígelo con el lápiz ✎ de abajo.</p>}
      <p className="text-[0.68rem] leading-snug text-hud-muted">
        {days === null
          ? 'Aprendiendo tu ritmo de uso: se afina con cada registro.'
          : days === 0
            ? 'Debería estar por acabarse: confírmalo con “queda…”.'
            : `Alcanza ~${days} ${days === 1 ? 'día' : 'días'} · se acaba el ${formatDay(sum.runsOutOn as string)}${sum.learnedRate === null && article.plannedPerDay ? ' (previsto)' : ''}`}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- usar / revisar */

function UseForm({ article, sum, act }: { article: Article; sum: ArticleSummary; act: (action: LotAction) => void }) {
  if (sum.lots.length === 0) {
    return <p className="mt-3 text-xs text-hud-muted">Anota primero la compra en “Compré”.</p>
  }
  return (
    <div className="mt-3 flex flex-col gap-3">
      {!article.passive && article.use.length > 0 && (
        <Group title="Usé">
          {article.use.map((option) => (
            <Chip key={option.id} onClick={() => act({ type: 'use', articleId: article.id, amount: option.amount })}>
              {option.label}
            </Chip>
          ))}
        </Group>
      )}
      <Group title={article.passive ? 'Revisé el costal, queda' : 'Revisé, queda'}>
        {CHECKS.map((check) => (
          <Chip key={check.label} onClick={() => act({ type: 'check', articleId: article.id, fraction: check.value })}>
            {check.label}
          </Chip>
        ))}
      </Group>
      {article.ripenDays && (
        <Group title="Revisé la madurez">
          {RIPENESS_CHOICES.map((choice) => (
            <Chip key={choice.id} onClick={() => act({ type: 'ripe', articleId: article.id, score: RIPENESS[choice.id].score })}>
              {choice.label}
            </Chip>
          ))}
        </Group>
      )}
      {sum.lots.length > 1 && <p className="text-[0.66rem] text-hud-muted">Se aplica al lote que vence primero.</p>}
    </div>
  )
}

/* ------------------------------------------------------------------- comprar */

export function BuyForm({ article, lots, act }: { article: Article; lots: Lot[]; act: (action: LotAction) => void }) {
  const perKg = learnedPerKg(lots, article) ?? article.perKg ?? null
  const [optionId, setOptionId] = useState(article.buy[0].id)
  const [qty, setQty] = useState(1)
  const [pieces, setPieces] = useState<number | null>(null)
  const [expiry, setExpiry] = useState<number | null>(article.expiry.kind === 'date' ? article.expiry.days : null)
  const { state } = useGame()
  const [boughtAt, setBoughtAt] = useState(state.today)
  const [stage, setStage] = useState<'verde' | 'punto' | 'consumir'>('punto')

  const option = article.buy.find((entry) => entry.id === optionId) ?? article.buy[0]
  const byKilo = option.kg !== undefined && article.tracking === 'units'
  const computed = byKilo ? Math.max(1, Math.round((option.kg as number) * qty * (perKg ?? 1))) : buyAmount(article, option, perKg) * qty
  const total = pieces ?? computed
  const days = article.expiry.kind === 'date' ? [...new Set([...EXPIRY_CHOICES, article.expiry.days])].sort((a, b) => a - b) : []

  return (
    <div className="mt-3 flex flex-col gap-3">
      {article.buy.length > 1 && (
        <Group title="Compré">
          {article.buy.map((entry) => (
            <Chip
              key={entry.id}
              active={entry.id === option.id}
              onClick={() => {
                setOptionId(entry.id)
                setPieces(null)
              }}
            >
              {entry.label}
              {entry.hint ? <span className="ml-1 text-hud-muted">· {entry.hint}</span> : null}
            </Chip>
          ))}
        </Group>
      )}

      <Group title={article.buy.length > 1 ? 'Cantidad' : `Compré · ${option.label}`}>
        <Stepper
          value={qty}
          onChange={(value) => {
            setQty(value)
            setPieces(null)
          }}
        />
      </Group>

      {byKilo && (
        <Group title={`¿Cuántas ${article.unit[1]} salieron?`}>
          <Stepper value={total} onChange={setPieces} />
        </Group>
      )}

      {days.length > 0 && (
        <Group title="Vence en">
          {days.map((value) => (
            <Chip key={value} active={expiry === value} onClick={() => setExpiry(value)}>
              {durationLabel(value)}
            </Chip>
          ))}
          <Chip active={expiry === null} onClick={() => setExpiry(null)}>
            Sin fecha
          </Chip>
        </Group>
      )}

      {article.ripenDays && (
        <Group title="Cómo llegó">
          {RIPENESS_CHOICES.map((choice) => (
            <Chip key={choice.id} active={stage === choice.id} onClick={() => setStage(choice.id)}>
              {choice.label}
            </Chip>
          ))}
        </Group>
      )}

      <label className="block">
        <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Fecha de ingreso</span>
        <input type="date" max={state.today} value={boughtAt} onChange={(event) => setBoughtAt(event.target.value || state.today)} className={fieldClass} />
      </label>

      <p className="text-[0.68rem] leading-snug text-hud-muted">
        {qty} × {option.label} = {formatAmount(article, total)}
        {byKilo ? ` · ~${Math.round((total / ((option.kg as number) * qty)) * 10) / 10} por kilo` : ''}
      </p>

      <button
        type="button"
        onClick={() =>
          act({
            type: 'buy',
            articleId: article.id,
            lotId: crypto.randomUUID(),
            amount: total,
            kg: option.kg !== undefined ? option.kg * qty : null,
            expiresInDays: expiry,
            boughtAt: boughtAt < state.today ? boughtAt : undefined,
            ripeScore: article.ripenDays ? RIPENESS[stage].score : undefined,
          })
        }
        className="w-full rounded-lg bg-amber-200/25 px-2 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 active:scale-[0.98]"
      >
        Guardar compra
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------------- lotes */

function LotList({ article, sum, today, act, onEdit }: { article: Article; sum: ArticleSummary; today: string; act: (action: LotAction) => void; onEdit: (lotId: string) => void }) {
  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <p className="mb-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">{sum.lots.length === 1 ? 'Lote' : `Lotes (${sum.lots.length})`}</p>
      <ul className="flex flex-col gap-1">
        {sum.lots.slice(0, 6).map((lot) => {
          const state = expiryOf(lot, article, today)
          return (
            <li key={lot.id} className="flex items-center justify-between gap-2 text-[0.7rem]">
              <span className="min-w-0 truncate">
                {formatAmount(article, estimate(lot, article, sum.rate, today))}
                <span className="text-hud-muted"> · {formatDayShort(lot.boughtAt)}</span>
                <span className={`ml-1 ${TONE[state.tone]}`}>· {state.label}</span>
                {lot.by === 'Inicio' && <span className="ml-1 text-hud-warn">· aprox.</span>}
              </span>
              <button
                type="button"
                onClick={() => onEdit(lot.id)}
                aria-label="Corregir este lote"
                title="Corregir fecha, cantidad o peso"
                className="grid size-6 shrink-0 place-items-center rounded-md text-hud-muted ring-1 ring-white/15 transition hover:bg-white/10 hover:text-hud-foreground"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => act({ type: 'finish', lotId: lot.id })}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-hud-muted ring-1 ring-white/15 transition hover:bg-white/10 hover:text-hud-foreground"
              >
                Agotado
              </button>
            </li>
          )
        })}
      </ul>
      {sum.lots.length > 6 && <p className="mt-1 text-[0.66rem] text-hud-muted">+{sum.lots.length - 6} lotes más</p>}
    </div>
  )
}

