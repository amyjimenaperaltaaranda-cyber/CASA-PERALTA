'use client'

import { ChefHat, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { Modal } from '@/components/ui/modal'
import { type Article, articles, formatAmount, measuresOf, type ProductSettings, zoneOfShelf } from '@/lib/catalog'
import { type CookItem, summarize } from '@/lib/lots'
import { fieldClass } from './panel-parts'
import { entryFor, parseQty, QuantityField, unitsOf } from './quantity'

/** Lo que se cocina sale de la refri, el congelador, la alacena y el frutero. */
const KITCHEN = new Set(['fridge', 'freezer', 'pantry', 'fruit'])
const strip = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Row = { articleId: string; qty: string; unitId: string }

/** Botón «Cociné» de la barra superior de la cocina. */
export function CookButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        data-popover-trigger
        onClick={() => setOpen(true)}
        aria-label="Cociné: descontar lo que usé"
        title="Cociné: descontar lo que usé"
        // En pantallas angostas solo el ícono, para no chocar con el texto central de la escena.
        className="glass flex items-center gap-2 rounded-full p-1.5 text-sm text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/70 min-[1400px]:pr-4"
      >
        <span className="grid size-7 place-items-center rounded-full bg-amber-200/90 text-stone-900">
          <ChefHat aria-hidden className="size-4" />
        </span>
        <span aria-hidden className="hidden min-[1400px]:inline">
          Cociné
        </span>
      </button>
      {open && <CookPanel onClose={() => setOpen(false)} />}
    </>
  )
}

/** Una cocinada: varios ingredientes con su cantidad («3 tazas de arroz», «4 huevos») en un solo registro. */
function CookPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame()
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Row[]>([])

  // Sugerencias sin búsqueda: primero lo que más se usa (según el historial) y los básicos de uso diario.
  const pantry = useMemo(() => {
    const uses = new Map<string, number>()
    for (const entry of state.history) if (entry.kind === 'use') uses.set(entry.articleId, (uses.get(entry.articleId) ?? 0) + 1)
    return articles
      .filter((article) => KITCHEN.has(zoneOfShelf(article.shelfId) ?? '') && !article.deletedAt)
      .map((article) => ({ article, sum: summarize(article, state.lots, state.today), uses: uses.get(article.id) ?? 0 }))
      .filter((entry) => entry.sum.lots.length > 0)
      .sort((a, b) => b.uses - a.uses || Number(!!b.article.passive) - Number(!!a.article.passive) || a.article.name.localeCompare(b.article.name))
  }, [state.lots, state.today, state.history])
  const term = strip(search.trim())
  const matches = pantry.filter((entry) => !rows.some((row) => row.articleId === entry.article.id) && (!term || strip(entry.article.name).includes(term))).slice(0, term ? 12 : 10)

  const items: CookItem[] = rows.flatMap((row) => {
    const article = pantry.find((entry) => entry.article.id === row.articleId)?.article
    const qty = parseQty(row.qty)
    if (!article || qty <= 0) return []
    const unit = unitsOf(article, measuresOf(article, state.settings[article.id])).find((entry) => entry.id === row.unitId)
    return unit ? [{ articleId: article.id, ...entryFor(article, qty, unit, 'cocina') }] : []
  })

  const add = (article: Article) => {
    const units = unitsOf(article, measuresOf(article, state.settings[article.id]))
    setRows((list) => [...list, { articleId: article.id, qty: '', unitId: units[0].id }])
    setSearch('')
  }

  return (
    <Modal label="Registrar lo que cociné" onClose={onClose} maxWidth="max-w-[30rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-hud-muted">Cocina</p>
          <h2 className="font-serif text-2xl leading-tight">¿Qué cocinaste?</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
          <X className="size-4" />
        </button>
      </div>

      <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional: «Almuerzo: arroz con pollo»" className={`${fieldClass} mt-3`} aria-label="Qué cocinaste" />

      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        {rows.length > 0 && (
          <ul className="mb-3 flex flex-col gap-2">
            {rows.map((row, index) => {
              const entry = pantry.find((item) => item.article.id === row.articleId)
              if (!entry) return null
              return (
                <IngredientRow
                  key={row.articleId}
                  article={entry.article}
                  stock={formatAmount(entry.article, entry.sum.total)}
                  settings={state.settings[entry.article.id]}
                  row={row}
                  onChange={(qty, unitId) => setRows((list) => list.map((item, at) => (at === index ? { ...item, qty, unitId } : item)))}
                  onRemove={() => setRows((list) => list.filter((_, at) => at !== index))}
                />
              )
            })}
          </ul>
        )}

        <label className="relative block">
          <Search aria-hidden className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-hud-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={rows.length ? 'Agregar otro ingrediente…' : 'Busca un ingrediente: arroz, huevos…'} className={`${fieldClass} pl-7`} aria-label="Buscar ingrediente" />
        </label>
        <div className="mt-2 flex flex-wrap gap-1">
          {matches.map((entry) => (
            <button key={entry.article.id} type="button" onClick={() => add(entry.article)} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs ring-1 ring-white/15 transition hover:bg-amber-200/25 hover:ring-amber-200/60 active:scale-95">
              {entry.article.name}
            </button>
          ))}
          {term && matches.length === 0 && <p className="text-[0.7rem] text-hud-muted">No hay «{search.trim()}» con stock en la cocina.</p>}
        </div>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => {
            dispatch({ type: 'cook', items, note: note.trim() || undefined })
            onClose()
          }}
          className="w-full rounded-lg bg-amber-200/25 px-3 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 disabled:opacity-40"
        >
          {items.length === 0 ? 'Agrega ingredientes y cantidades' : `Descontar ${items.length} ${items.length === 1 ? 'ingrediente' : 'ingredientes'}`}
        </button>
      </div>
    </Modal>
  )
}

function IngredientRow({
  article,
  stock,
  settings,
  row,
  onChange,
  onRemove,
}: {
  article: Article
  stock: string
  settings?: ProductSettings
  row: Row
  onChange: (qty: string, unitId: string) => void
  onRemove: () => void
}) {
  const units = unitsOf(article, measuresOf(article, settings))
  return (
    <li className="rounded-lg bg-white/6 p-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm">{article.name}</span>
        <span className="flex shrink-0 items-center gap-1 text-[0.66rem] text-hud-muted">
          hay {stock}
          <button type="button" aria-label={`Quitar ${article.name}`} onClick={onRemove} className="grid size-6 place-items-center rounded-md transition hover:bg-white/10 hover:text-hud-danger">
            <Trash2 className="size-3" />
          </button>
        </span>
      </div>
      <QuantityField article={article} units={units} qty={row.qty} unitId={row.unitId} onChange={onChange} />
    </li>
  )
}

