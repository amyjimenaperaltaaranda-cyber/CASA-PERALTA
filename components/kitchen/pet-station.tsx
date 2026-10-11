'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/components/game/game-provider'
import { feedingKey, feedingPlan } from '@/lib/inventory'
import { MAIN_HOTSPOTS, PETS_STATION, rectStyle, type ZoomView } from '@/lib/scene'
import { GlassCard } from './glass-card'
import { PetBowl } from './pet-bowl'

type PetStationProps = {
  active: boolean
  onHover: (view: ZoomView | null) => void
  onOpen: (view: ZoomView) => void
}

const catTransition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] } as const

export function PetStation({ active, onHover, onOpen }: PetStationProps) {
  const { state } = useGame()
  const spot = MAIN_HOTSPOTS.zoomed_pets

  return (
    <>
      <button
        type="button"
        aria-label={spot.label}
        onClick={() => onOpen('zoomed_pets')}
        onMouseEnter={() => onHover('zoomed_pets')}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover('zoomed_pets')}
        onBlur={() => onHover(null)}
        className="absolute z-30 cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
        style={rectStyle(PETS_STATION)}
      >
        <motion.img
          src="/images/monchi.png"
          alt=""
          className="pointer-events-none absolute bottom-[14%] left-[1%] w-[39%] drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)]"
          initial={false}
          animate={{ opacity: active ? 1 : 0, x: active ? '0%' : '-12%' }}
          transition={{ ...catTransition, delay: active ? 0.25 : 0 }}
        />
        <motion.img
          src="/images/mandy.png"
          alt=""
          className="pointer-events-none absolute bottom-[14%] right-[0%] w-[40%] drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)]"
          initial={false}
          animate={{ opacity: active ? 1 : 0, x: active ? '0%' : '12%' }}
          transition={{ ...catTransition, delay: active ? 0.35 : 0 }}
        />

        <div className="pointer-events-none absolute bottom-[6%] left-[28%] w-[19%]">
          <PetBowl name="Monchi" tint="#c97b4a" filled={active} />
        </div>
        <div className="pointer-events-none absolute bottom-[6%] left-[53%] w-[19%]">
          <PetBowl name="Mandy" tint="#7d8a96" filled={active} delay={0.08} />
        </div>
      </button>

      <GlassCard open={active} eyebrow="Mascotas · clic para acercarte" title="Monchi y Mandy" style={{ left: '24%', top: '52%' }}>
        <ul className="flex flex-col gap-1.5 text-xs">
          {feedingPlan.map((plan) => {
            const done = plan.slots.filter((slot) => state.feeding[feedingKey(plan.cat, slot)]).length
            return (
              <li key={plan.cat} className="flex items-center justify-between gap-3">
                <span>{plan.cat}</span>
                <span className="tabular-nums text-hud-muted">
                  {done}/{plan.slots.length} comidas
                </span>
              </li>
            )
          })}
        </ul>
      </GlassCard>
    </>
  )
}
