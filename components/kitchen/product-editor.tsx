'use client'

import { useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import type { Article } from '@/lib/catalog'
import { fieldClass } from './panel-parts'
import { ShelfPicker } from './shelf-picker'

/** Editar un producto creado por la familia: nombre y mueble. Quitarlo es un borrado suave. */
export function ProductEditor({ article, onClose }: { article: Article; onClose: () => void }) {
  const { dispatch } = useGame()
  const [name, setName] = useState(article.name)
  const [shelfId, setShelfId] = useState(article.shelfId)
  const [confirm, setConfirm] = useState(false)
  const changed = name.trim() !== article.name || shelfId !== article.shelfId

  return (
    <div className="mt-3 flex flex-col gap-3">
      <label className="block">
        <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Nombre</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </label>
      <ShelfPicker value={shelfId} onChange={setShelfId} />
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-white/10 px-2 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/20">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!changed || !name.trim()}
          onClick={() => {
            dispatch({ type: 'editProduct', id: article.id, patch: { name, shelfId } })
            onClose()
          }}
          className="flex-1 rounded-lg bg-amber-200/25 px-2 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 disabled:opacity-40"
        >
          Guardar
        </button>
      </div>
      <div className="border-t border-white/10 pt-2">
        {confirm ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] leading-snug text-hud-muted">Se oculta, pero sus lotes y su historial se conservan y puedes restaurarlo.</p>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'archiveProduct', id: article.id })
                onClose()
              }}
              className="shrink-0 rounded-lg bg-hud-danger/25 px-2.5 py-1.5 text-xs ring-1 ring-hud-danger/60 transition hover:bg-hud-danger/35"
            >
              Sí, quitar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="text-[0.7rem] text-hud-muted underline decoration-white/30 underline-offset-2 transition hover:text-hud-danger">
            Quitar este producto
          </button>
        )}
      </div>
    </div>
  )
}
