'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/components/game/game-provider'
import { articles } from '@/lib/catalog'
import { fruitStatus, RIPENESS } from '@/lib/fruit'
import { activeLots } from '@/lib/lots'
import { FRUIT_BOWL, LAMP_ORIGIN, MAIN_HOTSPOTS, rectStyle, type ZoomView } from '@/lib/scene'
import { GlassCard } from './glass-card'

type FruitBowlHotspotProps = {
  active: boolean
  onHover: (view: ZoomView | null) => void
  onOpen: (view: ZoomView) => void
}

/** Where each fruit sits in the bowl of the main scene. */
const FRUIT_PINS: Record<string, { x: number; y: number }> = {
  platanos: { x: 46.4, y: 54.2 },
  naranjas: { x: 52.8, y: 57.4 },
  peras: { x: 55.3, y: 55.6 },
  manzanas: { x: 49.4, y: 58.4 },
}

const light = { duration: 0.8, ease: [0.22, 1, 0.36, 1] } as const

const fruits = articles.filter((article) => article.ripenDays)

export function FruitBowlHotspot({ active, onHover, onOpen }: FruitBowlHotspotProps) {
  const { state } = useGame()
  const stageOf = (id: string) => fruitStatus(articles.find((article) => article.id === id) as (typeof articles)[number], activeLots(state.lots, id), state.today).stage
  const lit = active ? 1 : 0
  const spot = MAIN_HOTSPOTS.zoomed_fruit
  const pinned = fruits.filter((fruit) => FRUIT_PINS[fruit.id] && stageOf(fruit.id))

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: 'radial-gradient(ellipse 22% 30% at 50.5% 55%, transparent 0%, rgba(8,6,4,0.55) 100%)' }}
        initial={false}
        animate={{ opacity: lit }}
        transition={light}
      />

      {/* cone of light from the pendant lamp */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-10 -translate-x-1/2 blur-[6px]"
        style={{
          left: `${LAMP_ORIGIN.x}%`,
          top: `${LAMP_ORIGIN.y - 0.6}%`,
          width: '24%',
          height: '40%',
          clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(to bottom, rgba(255,214,150,0.55), rgba(255,190,110,0.12) 70%, transparent)',
          mixBlendMode: 'screen',
          transformOrigin: 'top center',
        }}
        initial={false}
        animate={{ opacity: lit, scaleY: active ? 1 : 0.9 }}
        transition={light}
      />

      {/* bulb */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${LAMP_ORIGIN.x}%`,
          top: `${LAMP_ORIGIN.y - 1}%`,
          width: '9%',
          aspectRatio: '3 / 1',
          background: 'radial-gradient(ellipse at center, rgba(255,236,190,0.95), rgba(255,200,120,0.35) 45%, transparent 72%)',
          mixBlendMode: 'screen',
        }}
        initial={false}
        animate={{ opacity: lit }}
        transition={{ duration: 0.25 }}
      />

      {/* pool of light on the counter */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          left: '50.6%',
          top: '60%',
          width: '30%',
          height: '20%',
          background: 'radial-gradient(ellipse at center, rgba(255,210,140,0.6), rgba(255,180,100,0.18) 50%, transparent 72%)',
          mixBlendMode: 'screen',
        }}
        initial={false}
        animate={{ opacity: lit }}
        transition={{ ...light, delay: active ? 0.1 : 0 }}
      />

      <button
        type="button"
        aria-label={spot.label}
        onClick={() => onOpen('zoomed_fruit')}
        onMouseEnter={() => onHover('zoomed_fruit')}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover('zoomed_fruit')}
        onBlur={() => onHover(null)}
        className={`absolute z-30 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 ${spot.shape}`}
        style={rectStyle(FRUIT_BOWL)}
      />

      {pinned.map((fruit, index) => {
        const pin = FRUIT_PINS[fruit.id]
        const color = RIPENESS[stageOf(fruit.id) ?? 'punto'].color
        return (
          <motion.span
            key={fruit.id}
            aria-hidden
            className="pointer-events-none absolute z-30 size-[0.55vw] min-h-1.5 min-w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/70"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
            initial={false}
            animate={{ opacity: lit, scale: active ? 1 : 0.4 }}
            transition={{ duration: 0.4, delay: active ? 0.3 + index * 0.08 : 0 }}
          />
        )
      })}

      <GlassCard open={active} eyebrow="Nivel de madurez" title="Frutero de la isla" style={{ left: '58.5%', top: '36%' }}>
        <ul className="flex flex-col gap-2 text-xs">
          {fruits.map((fruit) => {
            const stage = stageOf(fruit.id)
            const r = RIPENESS[stage ?? 'verde']
            return (
              <li key={fruit.id}>
                <div className="flex items-center justify-between gap-2">
                  <span>{fruit.name}</span>
                  <span className="text-[0.65rem]" style={{ color: stage ? r.color : undefined }}>{stage ? r.label : 'Sin stock'}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: r.color }}
                    initial={{ width: 0 }}
                    animate={{ width: active && stage ? `${r.fill}%` : 0 }}
                    transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </GlassCard>
    </>
  )
}
