'use client'

import { useState } from 'react'
import { type Article, baseMeasure, formatAmount, formatMeasure, type Measure, toBase } from '@/lib/catalog'
import type { UseInput } from '@/lib/lots'
import { fieldClass } from './panel-parts'

/** Campo sin `w-full`, para poder darle un ancho fijo. */
export const boxClass = fieldClass.replace('w-full ', '')

/** Unidades en que se puede decir una cantidad: las medidas de cocina del producto y su unidad base. */
export const unitsOf = (article: Article, measures: Measure[]): Measure[] => [...measures, baseMeasure(article)]

/** Lo que se guarda al usar `qty` de `unit`: cantidad en unidad base + lo que dijo la persona. */
export function entryFor(article: Article, qty: number, unit: Measure, source?: UseInput['source']): { amount: number } & UseInput {
  return {
    amount: toBase(qty, unit),
    qty,
    measureId: unit.id,
    label: unit.id === 'base' ? formatAmount(article, qty) : formatMeasure(qty, unit),
    ...(source ? { source } : {}),
  }
}

/** Número + unidad («2,5» «tazas»), con la equivalencia en la unidad base debajo. */
export function QuantityField({
  article,
  units,
  qty,
  unitId,
  onChange,
}: {
  article: Article
  units: Measure[]
  qty: string
  unitId: string
  onChange: (qty: string, unitId: string) => void
}) {
  const unit = units.find((entry) => entry.id === unitId) ?? units[0]
  const value = parseQty(qty)
  return (
    <div>
      <div className="flex gap-1.5">
        <input
          inputMode="decimal"
          aria-label="Cantidad"
          value={qty}
          onChange={(event) => onChange(event.target.value, unit.id)}
          placeholder="0"
          className={`${boxClass} w-16 shrink-0 text-center tabular-nums`}
        />
        <select aria-label="Unidad" value={unit.id} onChange={(event) => onChange(qty, event.target.value)} className={`${boxClass} min-w-0 flex-1`}>
          {units.map((entry) => (
            <option key={entry.id} value={entry.id} className="bg-stone-900">
              {entry.label[1]}
            </option>
          ))}
        </select>
      </div>
      {value > 0 && unit.id !== 'base' && <p className="mt-0.5 text-[0.65rem] text-hud-muted">= {formatAmount(article, toBase(value, unit))}</p>}
    </div>
  )
}

/** «2,5», «2.5», «½», «1 ½» → número (0 si no se entiende). */
export function parseQty(text: string): number {
  const clean = text.trim().replace(',', '.')
  if (!clean) return 0
  const fractions: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }
  const match = clean.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔])?$/)
  if (!match || (!match[1] && !match[2])) return 0
  return (match[1] ? Number(match[1]) : 0) + (match[2] ? fractions[match[2]] : 0)
}

/** Estado de un campo de cantidad: texto + unidad elegida. */
export function useQuantity(defaultUnit: string) {
  const [qty, setQty] = useState('')
  const [unitId, setUnitId] = useState(defaultUnit)
  return {
    qty,
    unitId,
    value: parseQty(qty),
    set: (nextQty: string, nextUnit: string) => {
      setQty(nextQty)
      setUnitId(nextUnit)
    },
    reset: () => setQty(''),
  }
}
