'use client'

import { useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { type Article, editUnit, parOf } from '@/lib/catalog'
import { RIPENESS, RIPENESS_CHOICES, type Ripeness, stageOf, lotScore } from '@/lib/fruit'
import type { EditPatch, Lot } from '@/lib/lots'
import { Chip, fieldClass, Group } from './panel-parts'

const toField = (value: number, factor: number) => String(Math.round((value / factor) * 1000) / 1000)
const parse = (text: string) => {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(value) ? value : null
}

/** Corregir un lote a mano: fecha de ingreso, cantidad al comprar, cantidad actual y vencimiento. Borrar es suave (se puede restaurar). */
export function LotEditor({ article, lot, onClose }: { article: Article; lot: Lot; onClose: () => void }) {
  const { state, dispatch } = useGame()
  const { today } = state
  const unit = editUnit(article, Math.max(lot.initial, parOf(article)))
  const [boughtAt, setBoughtAt] = useState(lot.boughtAt)
  const [initial, setInitial] = useState(toField(lot.initial, unit.factor))
  const [amount, setAmount] = useState(toField(lot.amount, unit.factor))
  const [expiresAt, setExpiresAt] = useState(lot.expiresAt ?? '')
  const [stage, setStage] = useState<Ripeness | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const initialValue = parse(initial)
  const amountValue = parse(amount)
  const error =
    !boughtAt || boughtAt > today
      ? 'La fecha de ingreso no puede ser futura.'
      : initialValue === null || initialValue <= 0
        ? 'Pon cuánto había al comprar.'
        : amountValue === null || amountValue < 0
          ? 'Pon cuánto queda ahora (0 si se acabó).'
          : amountValue > initialValue
            ? 'Lo que queda no puede ser más de lo que había al comprar.'
            : null

  const save = () => {
    if (error || initialValue === null || amountValue === null) return
    const patch: EditPatch = {}
    if (boughtAt !== lot.boughtAt) patch.boughtAt = boughtAt
    const nextInitial = Math.round(initialValue * unit.factor * 1000) / 1000
    const nextAmount = Math.round(amountValue * unit.factor * 1000) / 1000
    if (nextInitial !== lot.initial) patch.initial = nextInitial
    if (nextAmount !== lot.amount) patch.amount = nextAmount
    if ((expiresAt || null) !== lot.expiresAt) patch.expiresAt = expiresAt || null
    if (stage) patch.ripeScore = RIPENESS[stage].score
    if (Object.keys(patch).length > 0) dispatch({ type: 'edit', lotId: lot.id, patch })
    onClose()
  }

  const currentStage = article.ripenDays ? stageOf(lotScore(lot, article, today)) : null

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-[0.68rem] leading-snug text-hud-muted">
        {lot.by === 'Inicio' ? 'Este lote es un valor inicial aproximado: ponle los datos reales.' : 'Corrige los datos de este lote.'} Con datos reales la app aprende tu ritmo de uso.
      </p>

      <label className="block">
        <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Fecha de ingreso</span>
        <input type="date" max={today} value={boughtAt} onChange={(event) => setBoughtAt(event.target.value)} className={fieldClass} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Al comprar ({unit.label})</span>
          <input inputMode="decimal" value={initial} onChange={(event) => setInitial(event.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Queda ahora ({unit.label})</span>
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={fieldClass} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Vence (opcional)</span>
        <div className="flex gap-1">
          <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={fieldClass} />
          {expiresAt && (
            <button type="button" onClick={() => setExpiresAt('')} className="shrink-0 rounded-lg bg-white/10 px-2 text-[0.7rem] ring-1 ring-white/15 hover:bg-white/20">
              Sin fecha
            </button>
          )}
        </div>
      </label>

      {currentStage && (
        <Group title="Madurez ahora">
          {RIPENESS_CHOICES.map((choice) => (
            <Chip key={choice.id} active={(stage ?? currentStage) === choice.id} onClick={() => setStage(choice.id)}>
              {choice.label}
            </Chip>
          ))}
        </Group>
      )}

      {error && <p className="text-[0.7rem] text-hud-danger">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-white/10 px-2 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]">
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={error !== null}
          className="flex-1 rounded-lg bg-amber-200/25 px-2 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 active:scale-[0.98] disabled:opacity-40"
        >
          Guardar cambios
        </button>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        {confirmDiscard ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] leading-snug text-hud-muted">Se cierra este lote y pasa a la lista de compras, pero queda marcado como malogrado (no como consumido).</p>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'discard', lotId: lot.id })
                onClose()
              }}
              className="shrink-0 rounded-lg bg-hud-danger/25 px-2.5 py-1.5 text-xs ring-1 ring-hud-danger/60 transition hover:bg-hud-danger/35"
            >
              Sí, descartar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDiscard(true)} className="text-left text-[0.7rem] text-hud-muted underline decoration-white/30 underline-offset-2 transition hover:text-hud-danger">
            Descartar · se malogró
          </button>
        )}

        {confirmDelete ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] leading-snug text-hud-muted">Se oculta, pero queda en el historial y se puede restaurar.</p>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'delete', lotId: lot.id })
                onClose()
              }}
              className="shrink-0 rounded-lg bg-hud-danger/25 px-2.5 py-1.5 text-xs ring-1 ring-hud-danger/60 transition hover:bg-hud-danger/35"
            >
              Sí, borrar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-left text-[0.7rem] text-hud-muted underline decoration-white/30 underline-offset-2 transition hover:text-hud-danger">
            Borrar este lote (fue un error al anotarlo)
          </button>
        )}
      </div>
    </div>
  )
}
