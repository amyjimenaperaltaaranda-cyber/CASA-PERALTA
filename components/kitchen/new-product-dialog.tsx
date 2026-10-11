'use client'

import { Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { Modal } from '@/components/ui/modal'
import { shelves } from '@/lib/catalog'
import { DEFAULT_SHELF, nameCase, recognize } from '@/lib/dictionary'
import { buildArticle, type Draft, draftForType, lifeSummary, type Mode, productTypeById, productTypes } from '@/lib/product-types'
import { BuyForm } from './register-panel'
import { Chip, fieldClass, Group } from './panel-parts'
import { ShelfPicker } from './shelf-picker'

const STEPS = ['Qué es', 'Dónde y cuánto dura', 'Primera compra']

/** Ventana para crear un producto que no está en la lista. Se abre desde "Nuevo" (arriba) o desde "+ Producto" en un mueble. */
export function NewProductDialog() {
  const { state, dispatch } = useGame()
  const open = state.newProduct
  return open ? <Dialog preset={open} onClose={() => dispatch({ type: 'closeNewProduct' })} /> : null
}

function Dialog({ preset, onClose }: { preset: { shelfId?: string; name?: string }; onClose: () => void }) {
  const { dispatch } = useGame()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(preset.name ?? '')
  const [typeId, setTypeId] = useState<string | null>(null)
  const [pickedByUser, setPickedByUser] = useState(false)
  const [shelfId, setShelfId] = useState(preset.shelfId ?? 'otros-fridge')
  const [shelfTouched, setShelfTouched] = useState(Boolean(preset.shelfId))
  const [mode, setMode] = useState<Mode | null>(null)
  const [noun, setNoun] = useState<[string, string] | null>(null)
  const [openLife, setOpenLife] = useState<number | null>(null)
  const [inUseLife, setInUseLife] = useState<number | null>(null)
  const [showError, setShowError] = useState(false)

  const recognized = useMemo(() => recognize(name), [name])
  const effectiveTypeId = typeId ?? recognized?.typeId ?? null
  const type = effectiveTypeId ? productTypeById(effectiveTypeId) : undefined
  const suggestedShelf = type ? (recognized && recognized.typeId === type.id && recognized.shelfId ? recognized.shelfId : (DEFAULT_SHELF[type.id] ?? 'otros-fridge')) : null
  const effectiveShelf = shelfTouched ? shelfId : (suggestedShelf ?? shelfId)

  const draft: Draft | null = type
    ? {
        ...draftForType(type, { name: nameCase(name), shelfId: effectiveShelf }),
        ...(mode && type.modes.includes(mode) ? { mode } : {}),
        ...(noun ? { noun } : {}),
        ...(openLife !== null ? { openLife } : {}),
        ...(inUseLife !== null ? { inUseLife } : {}),
      }
    : null

  const nameOk = name.trim().length >= 2
  const next = () => {
    if (step === 0 && (!nameOk || !type)) {
      setShowError(true)
      return
    }
    setShowError(false)
    setStep((value) => value + 1)
  }

  const article = useMemo(() => (draft ? buildArticle(draft, `p-${crypto.randomUUID().slice(0, 8)}`) : null), [draft?.name, draft?.typeId, draft?.mode, draft?.noun?.join('|'), draft?.shelfId, draft?.openLife, draft?.inUseLife]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal label="Nuevo producto" onClose={onClose}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-hud-muted">
              Paso {step + 1} de 3 · {STEPS[step]}
            </p>
            <h2 className="font-serif text-2xl leading-tight">Nuevo producto</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {STEPS.map((label, index) => (
            <span key={label} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-amber-200/80' : 'bg-white/15'}`} />
          ))}
        </div>

        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <label className="block">
                <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">¿Qué compraste?</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (!pickedByUser) setTypeId(null)
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && next()}
                  placeholder="mostaza, pescado, mermelada de membrillo…"
                  className={fieldClass}
                />
                {showError && !nameOk && <span className="mt-1 block text-[0.7rem] text-hud-danger">Escribe el nombre del producto.</span>}
              </label>

              {nameOk && recognized && !pickedByUser && (
                <p className="flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-2 text-[0.72rem] text-hud-muted">
                  <Sparkles aria-hidden className="size-3.5 shrink-0 text-amber-200" />
                  <span>
                    Lo reconozco como <strong className="text-hud-foreground">{productTypeById(recognized.typeId)?.name}</strong>. Cámbialo si no es así.
                  </span>
                </p>
              )}
              {nameOk && !recognized && !pickedByUser && <p className="rounded-lg bg-white/8 px-2.5 py-2 text-[0.72rem] text-hud-muted">No lo reconozco: elige a qué se parece.</p>}

              <Group title="Tipo de producto">
                {productTypes.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={effectiveTypeId === entry.id}
                    onClick={() => {
                      setTypeId(entry.id)
                      setPickedByUser(true)
                      setMode(null)
                      setNoun(null)
                      setOpenLife(null)
                      setInUseLife(null)
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-left ring-1 transition active:scale-95 ${effectiveTypeId === entry.id ? 'bg-amber-200/25 ring-amber-200/60' : 'bg-white/10 ring-white/15 hover:bg-white/20'}`}
                  >
                    <span className="block text-xs">{entry.name}</span>
                    <span className="block text-[0.62rem] text-hud-muted">{entry.example}</span>
                  </button>
                ))}
              </Group>
              {showError && nameOk && !type && <span className="text-[0.7rem] text-hud-danger">Elige un tipo para continuar.</span>}
            </div>
          )}

          {step === 1 && draft && type && (
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Dónde lo guardas</p>
                <ShelfPicker
                  value={effectiveShelf}
                  onChange={(id) => {
                    setShelfId(id)
                    setShelfTouched(true)
                  }}
                />
                <p className="mt-1 text-[0.68rem] text-hud-muted">Quedará en: {shelves.find((shelf) => shelf.id === effectiveShelf)?.name}</p>
              </div>

              {type.modes.length > 1 && (
                <Group title="Cómo lo cuentas">
                  {type.modes.map((entry) => (
                    <Chip key={entry} active={draft.mode === entry} onClick={() => setMode(entry)}>
                      {entry === 'measure' ? 'Por peso' : 'Por piezas'}
                    </Chip>
                  ))}
                </Group>
              )}
              {draft.mode === 'units' && (
                <label className="block">
                  <span className="mb-1 block text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">¿En qué unidad? (frasco, filete, bolsa…)</span>
                  <input
                    value={draft.noun[0]}
                    onChange={(event) => {
                      const singular = event.target.value.trim().toLowerCase()
                      setNoun([singular, singular ? (singular.endsWith('s') ? singular : /[aeiou]$/.test(singular) ? `${singular}s` : `${singular}es`) : ''])
                    }}
                    className={fieldClass}
                  />
                </label>
              )}

              {type.openLife && (
                <Group title="Cuánto dura abierto (días)">
                  {type.openLife.choices.map((days) => (
                    <Chip key={days} active={draft.openLife === days} onClick={() => setOpenLife(days)}>
                      {days}
                    </Chip>
                  ))}
                </Group>
              )}
              {type.inUseLife && (
                <Group title="Cuánto dura en uso (días)">
                  {type.inUseLife.choices.map((days) => (
                    <Chip key={days} active={draft.inUseLife === days} onClick={() => setInUseLife(days)}>
                      {days}
                    </Chip>
                  ))}
                </Group>
              )}
              <ul className="rounded-lg bg-white/8 px-3 py-2 text-[0.72rem] leading-snug text-hud-muted">
                {lifeSummary(draft).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          )}

          {step === 2 && article && (
            <div>
              <p className="text-[0.72rem] leading-snug text-hud-muted">
                <strong className="text-hud-foreground">{article.name}</strong> quedará en {shelves.find((shelf) => shelf.id === article.shelfId)?.name}. Anota la primera compra o créalo vacío.
              </p>
              <BuyForm article={article} lots={[]} act={(action) => dispatch({ type: 'newProduct', article, purchase: action.type === 'buy' ? action : undefined })} />
              <button type="button" onClick={() => dispatch({ type: 'newProduct', article })} className="mt-2 text-[0.7rem] text-hud-muted underline decoration-white/30 underline-offset-2 transition hover:text-hud-foreground">
                Crear sin compra por ahora
              </button>
            </div>
          )}
        </div>

        {step < 2 && (
          <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-lg bg-white/10 px-4 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/20">
                Atrás
              </button>
            )}
            <button type="button" onClick={next} className="flex-1 rounded-lg bg-amber-200/25 px-3 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 active:scale-[0.98]">
              Siguiente
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-lg bg-white/10 px-4 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/20">
              Atrás
            </button>
          </div>
        )}
    </Modal>
  )
}
