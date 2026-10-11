'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { articles, formatAmount, shelves } from '@/lib/catalog'
import { fruitStatus, RIPENESS } from '@/lib/fruit'
import { activeLots, summarize } from '@/lib/lots'
import { type Point, ZOOM_META } from '@/lib/scene'
import { RegisterPanel } from './register-panel'
import { ZoomShell } from './zoom-shell'

const fruitArticles = articles.filter((article) => article.ripenDays)
const shelf = shelves.find((entry) => entry.id === 'frutero')

export function FruitView({ origin }: { origin: Point }) {
  const { state } = useGame()
  const [openId, setOpenId] = useState<string | null>(null)
  const meta = ZOOM_META.zoomed_fruit

  return (
    <ZoomShell
      eyebrow={meta.eyebrow}
      title={meta.title}
      origin={origin}
      background={<img src="/images/fruit-island.png" alt="Frutero de madera bajo una lámpara colgante" className="absolute inset-0 size-full" draggable={false} />}
    >
      {/* la lámpara se enciende al llegar */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 45% 55% at 50% 45%, rgba(255,214,150,0.28), rgba(8,6,4,0.55) 100%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.7 }}
      />

      <motion.aside
        aria-label="Stock de frutas"
        className="absolute right-[3%] top-[12%] z-40 w-[clamp(13rem,26%,20rem)] rotate-[2deg] bg-amber-100 p-4 pt-6 text-stone-800 shadow-[0_14px_30px_rgba(0,0,0,0.5)]"
        initial={{ opacity: 0, y: -20, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: 2 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 1 }}
      >
        <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-16 -translate-x-1/2 rotate-[-3deg] bg-white/60 shadow" />
        <h3 className="font-serif text-xl leading-none">Frutas de la casa</h3>
        <p className="mt-1 text-[0.65rem] text-stone-500">Toca una fruta para anotar uso, compra o corregir cantidades.</p>
        <ul className="mt-3 flex flex-col gap-1">
          {fruitArticles.map((article) => {
            const sum = summarize(article, state.lots, state.today)
            const status = fruitStatus(article, activeLots(state.lots, article.id), state.today)
            const r = status.stage ? RIPENESS[status.stage] : null
            return (
              <li key={article.id}>
                <button
                  type="button"
                  data-popover-trigger
                  aria-expanded={openId === article.id}
                  onClick={() => setOpenId(openId === article.id ? null : article.id)}
                  className="w-full rounded-md p-1.5 text-left outline-none transition hover:bg-amber-200/60 focus-visible:ring-2 focus-visible:ring-amber-700/50 aria-expanded:bg-amber-200/80"
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {article.name} <span className="text-stone-500">{sum.lots.length ? formatAmount(article, sum.total) : 'sin stock'}</span>
                    </span>
                    {r && (
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: r.color }}>
                        {r.label}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-300/70">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: r?.color ?? 'transparent' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${r?.fill ?? 0}%` }}
                      transition={{ duration: 0.8, delay: 1.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="mt-0.5 text-[0.7rem] text-stone-500">{status.note}</p>
                </button>
              </li>
            )
          })}
        </ul>
      </motion.aside>

      <AnimatePresence>{openId && shelf && <RegisterPanel key={openId} shelf={shelf} placement="left" initialArticleId={openId} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </ZoomShell>
  )
}
