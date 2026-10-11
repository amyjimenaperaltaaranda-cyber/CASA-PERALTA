'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useRef, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { useDismiss } from '@/hooks/use-dismiss'
import { articleById, formatAmount, formatGrams } from '@/lib/catalog'
import { addDays, daysBetween, formatDay } from '@/lib/days'
import { feedingKey, feedingPlan } from '@/lib/inventory'
import { summarize } from '@/lib/lots'
import { LotEditor } from './lot-editor'
import { ZoomShell } from './zoom-shell'
import { type Point, rectStyle, ZOOM_META } from '@/lib/scene'

const BAG = { x: 70.5, y: 19, w: 25, h: 65 }
const PORTRAIT = { Monchi: '/images/monchi.png', Mandy: '/images/mandy.png' } as const
const PORTION = { Monchi: '½ taza al día', Mandy: '¾ de taza al día' } as const

const nowLabel = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

export function PetsView({ origin }: { origin: Point }) {
  const { state, dispatch } = useGame()
  const [bagOpen, setBagOpen] = useState(false)
  const meta = ZOOM_META.zoomed_pets

  return (
    <ZoomShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      origin={origin}
      background={<img src="/images/pets-floor.png" alt="Platos de las gatas y costal de Michicat" className="absolute inset-0 size-full" draggable={false} />}
    >
      <motion.aside
        aria-label="Lista de alimentación"
        className="absolute left-[3%] top-[16%] z-40 w-[clamp(14rem,30%,24rem)] -rotate-[2deg] bg-amber-50 p-4 pt-6 text-stone-800 shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.9 }}
      >
        <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[2deg] bg-white/60 shadow" />
        <h3 className="font-serif text-xl leading-none">Comidas de hoy</h3>
        <div className="mt-3 flex flex-col gap-4">
          {feedingPlan.map((plan) => (
            <section key={plan.cat}>
              <div className="flex items-center gap-2">
                <img src={PORTRAIT[plan.cat]} alt="" className="h-9 w-14 object-contain" />
                <div className="leading-tight">
                  <p className="font-serif text-lg">{plan.cat}</p>
                  <p className="text-[0.7rem] text-stone-500">{PORTION[plan.cat]}</p>
                </div>
              </div>
              <ul className="mt-1.5 flex flex-col gap-1">
                {plan.slots.map((slot) => {
                  const key = feedingKey(plan.cat, slot)
                  const entry = state.feeding[key]
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={!!entry}
                        onClick={() => dispatch({ type: 'feed', key, at: nowLabel() })}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-none transition hover:bg-stone-900/5 focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        <span className={`grid size-5 shrink-0 place-items-center rounded border-2 ${entry ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-400'}`}>
                          {entry && <Check aria-hidden className="size-3.5" />}
                        </span>
                        <span className={entry ? 'text-stone-500 line-through' : ''}>{slot}</span>
                        {entry && (
                          <span className="ml-auto text-[0.65rem] text-emerald-700 no-underline">
                            Completado por: {entry.by} · {entry.at}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </motion.aside>

      <button
        type="button"
        data-popover-trigger
        aria-label="Ver duración del costal de Michicat"
        aria-expanded={bagOpen}
        onClick={() => setBagOpen((open) => !open)}
        className="absolute z-30 cursor-pointer rounded-xl outline-none transition hover:bg-white/10 hover:ring-2 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-amber-200/80"
        style={rectStyle(BAG)}
      />

      <AnimatePresence>{bagOpen && <KibblePanel onClose={() => setBagOpen(false)} />}</AnimatePresence>
    </ZoomShell>
  )
}

const KIBBLE_CHECKS = [
  { label: 'Lleno', value: 1 },
  { label: '¾', value: 0.75 },
  { label: '½', value: 0.5 },
  { label: '¼', value: 0.25 },
  { label: 'Casi nada', value: 0.08 },
]

function KibblePanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame()
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose)

  const [editing, setEditing] = useState(false)
  const article = articleById('croquetas')
  if (!article) return null
  const { today } = state
  const sum = summarize(article, state.lots, today)
  const lot = sum.lots[0] ?? null
  const planned = article.plannedPerDay ?? 143

  // Plan: el costal completo alcanza para initial / planned días, contados desde que se abrió.
  const totalDays = lot ? lot.initial / planned : 0
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))
  const elapsed = lot ? Math.max(0, daysBetween(lot.boughtAt, today)) : 0
  const week = Math.min(totalWeeks, Math.floor(elapsed / 7) + 1)
  const plannedEnd = lot ? addDays(lot.boughtAt, Math.floor(totalDays)) : null
  const actualRate = sum.learnedRate
  const gap = actualRate !== null && sum.runsOutOn && plannedEnd ? daysBetween(sum.runsOutOn, plannedEnd) : 0
  const ratio = actualRate !== null ? actualRate / planned : null
  const progress = lot ? Math.min(100, Math.round(((lot.initial - sum.total) / lot.initial) * 100)) : 0

  const openNew = () => {
    if (lot) dispatch({ type: 'finish', lotId: lot.id })
    dispatch({ type: 'buy', articleId: article.id, lotId: crypto.randomUUID(), amount: 9000, kg: null, expiresInDays: null })
    onClose()
  }

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label="Costal de Michicat"
      className="glass absolute z-50 w-[clamp(14rem,25%,19rem)] rounded-xl p-4 text-hud-foreground"
      style={{ right: '31%', top: '20%' }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
    >
      <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-hud-muted">{article.name} · {formatGrams(lot?.initial ?? 9000)}</p>
      {lot && editing ? (
        <LotEditor article={article} lot={lot} onClose={onClose} />
      ) : lot ? (
        <>
          <p className="font-serif text-xl leading-tight">
            {sum.total <= 0 ? 'Costal terminado' : `Semana ${week} de ${totalWeeks}`}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-hud-ok" style={{ width: `${progress}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-hud-muted">Quedan</dt>
            <dd className="text-right tabular-nums">{formatAmount(article, sum.total)}</dd>
            <dt className="text-hud-muted">Ración prevista</dt>
            <dd className="text-right tabular-nums">{planned} g/día</dd>
            {actualRate !== null && (
              <>
                <dt className="text-hud-muted">Ritmo real</dt>
                <dd className="text-right tabular-nums">{Math.round(actualRate)} g/día</dd>
              </>
            )}
            <dt className="text-hud-muted">Se acaba</dt>
            <dd className="text-right">{formatDay(sum.runsOutOn ?? (plannedEnd as string))}</dd>
            <dt className="text-hud-muted">Abierto</dt>
            <dd className="text-right">{formatDay(lot.boughtAt)}</dd>
          </dl>
          {ratio !== null && (ratio > 1.08 || ratio < 0.92) && (
            <p className={`mt-2 text-[0.7rem] leading-snug ${ratio > 1.08 ? 'text-hud-warn' : 'text-hud-muted'}`}>
              {ratio > 1.08
                ? `Están comiendo ~${Math.round((ratio - 1) * 100)}% más de lo previsto: el costal se acabaría ${Math.max(1, gap)} ${Math.max(1, gap) === 1 ? 'día' : 'días'} antes.`
                : `Van ~${Math.round((1 - ratio) * 100)}% por debajo de lo previsto: sobrará algo de costal.`}
            </p>
          )}
          <p className="mb-1 mt-3 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-hud-muted">Revisé el costal, queda</p>
          <div className="flex flex-wrap gap-1">
            {KIBBLE_CHECKS.map((check) => (
              <button
                key={check.label}
                type="button"
                onClick={() => {
                  dispatch({ type: 'check', articleId: article.id, fraction: check.value })
                  onClose()
                }}
                className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
              >
                {check.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm">No hay un costal registrado.</p>
      )}
      {lot && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="mt-2 w-full rounded-lg bg-white/10 px-2 py-1.5 text-xs ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]">
          Corregir costal (peso, fecha, cuánto queda)
        </button>
      )}
      <button
        type="button"
        onClick={openNew}
        className="mt-3 w-full rounded-lg bg-amber-200/25 px-2 py-2 text-xs font-medium ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 active:scale-[0.98]"
      >
        Abrí un costal nuevo
      </button>
    </motion.div>
  )
}
