'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { type Article, containerOf, type Measure, measuresOf } from '@/lib/catalog'
import { boxClass, parseQty } from './quantity'

type Row = { id: string; singular: string; plural: string; amount: string }

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'medida'

/** «cucharada» → «cucharadas», «vaso» → «vasos», «taza» → «tazas». */
const pluralOf = (word: string) => (/[aeiouáéó]$/i.test(word) ? `${word}s` : `${word}es`)

/** Ajustar cuánto pesa la taza (o la cucharada, el vaso…) de la casa y la capacidad del frasco. */
export function MeasureEditor({ article, onClose }: { article: Article; onClose: () => void }) {
  const { state, dispatch } = useGame()
  const settings = state.settings[article.id]
  const unit = article.unit[0]
  const [rows, setRows] = useState<Row[]>(() => measuresOf(article, settings).map((entry) => ({ id: entry.id, singular: entry.label[0], plural: entry.label[1], amount: String(entry.amount) })))
  const initialJar = containerOf(article, settings)
  const [jarOn, setJarOn] = useState(initialJar !== null)
  const [jarLabel, setJarLabel] = useState(initialJar?.label ?? 'Frasco')
  const [jarAmount, setJarAmount] = useState(String(initialJar?.amount ?? ''))

  const update = (index: number, patch: Partial<Row>) => setRows((list) => list.map((row, at) => (at === index ? { ...row, ...patch } : row)))
  const measures: Measure[] = rows
    .filter((row) => row.singular.trim() && parseQty(row.amount) > 0)
    .map((row) => ({ id: row.id || slug(row.singular), label: [row.singular.trim(), (row.plural.trim() || pluralOf(row.singular.trim()))] as [string, string], amount: parseQty(row.amount) }))
  const jarValue = parseQty(jarAmount)
  const valid = !jarOn || (jarLabel.trim() !== '' && jarValue > 0)

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div>
        <p className="mb-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Medidas de la casa</p>
        <ul className="flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center gap-1.5 text-xs">
              <span className="text-hud-muted">1</span>
              <input aria-label="Nombre de la medida" value={row.singular} onChange={(event) => update(index, { singular: event.target.value, plural: '' })} placeholder="taza" className={`${boxClass} min-w-0 flex-1`} />
              <span className="text-hud-muted">=</span>
              <input aria-label={`Cuánto es en ${unit}`} inputMode="decimal" value={row.amount} onChange={(event) => update(index, { amount: event.target.value })} className={`${boxClass} w-16 text-center tabular-nums`} />
              <span className="w-5 text-hud-muted">{unit}</span>
              <button type="button" aria-label={`Quitar ${row.singular || 'medida'}`} onClick={() => setRows((list) => list.filter((_, at) => at !== index))} className="grid size-6 shrink-0 place-items-center rounded-md text-hud-muted transition hover:bg-white/10 hover:text-hud-danger">
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setRows((list) => [...list, { id: '', singular: '', plural: '', amount: '' }])} className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-hud-muted transition hover:text-hud-foreground">
          <Plus className="size-3" />
          Agregar medida (cucharada, vaso…)
        </button>
      </div>

      <div className="border-t border-white/10 pt-2">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={jarOn} onChange={(event) => setJarOn(event.target.checked)} className="accent-amber-300" />
          Se usa desde un frasco que se rellena
        </label>
        {jarOn && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <input aria-label="Nombre del recipiente" value={jarLabel} onChange={(event) => setJarLabel(event.target.value)} className={`${boxClass} min-w-0 flex-1`} />
            <span className="text-hud-muted">de</span>
            <input aria-label={`Capacidad en ${unit}`} inputMode="decimal" value={jarAmount} onChange={(event) => setJarAmount(event.target.value)} className={`${boxClass} w-16 text-center tabular-nums`} />
            <span className="w-5 text-hud-muted">{unit}</span>
          </div>
        )}
      </div>

      <p className="text-[0.66rem] leading-snug text-hud-muted">Pesa una taza llena de {article.name.toLowerCase()} y anótalo: así «3 tazas» se descuenta exacto.</p>

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-white/10 px-2 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/20">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => {
            dispatch({ type: 'setProductSettings', articleId: article.id, settings: { measures, container: jarOn ? { label: jarLabel.trim(), amount: jarValue } : null } })
            onClose()
          }}
          className="flex-1 rounded-lg bg-amber-200/25 px-2 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}
