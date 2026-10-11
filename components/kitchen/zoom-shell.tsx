'use client'

import { motion } from 'framer-motion'
import { Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useGame } from '@/components/game/game-provider'
import type { Point } from '@/lib/scene'

type ZoomShellProps = { eyebrow: string; title: string; background: ReactNode; children: ReactNode; origin?: Point }

const ease = [0.65, 0, 0.35, 1] as const

export function ZoomShell({ eyebrow, title, background, children, origin }: ZoomShellProps) {
  const { dispatch } = useGame()
  // Grow in from the exact spot the person clicked on the main scene, instead of a generic
  // center zoom, so the two screens read as one continuous camera move rather than a cut.
  const transformOrigin = origin ? `${origin.x}% ${origin.y}%` : '50% 50%'

  return (
    <motion.section
      aria-label={title}
      className="absolute inset-0 overflow-hidden"
      style={{ transformOrigin }}
      initial={{ opacity: 0, scale: 2.6, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.75, delay: 0.2, ease } }}
      exit={{ opacity: 0, scale: 1.5, filter: 'blur(8px)', transition: { duration: 0.5, ease } }}
    >
      {background}
      <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.55)]" />

      {children}

      <div className="absolute left-[1.5%] top-[2.5%] z-[80] flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => dispatch({ type: 'back' })}
          className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/70"
        >
          <span className="grid size-7 place-items-center rounded-full bg-amber-200/90 text-stone-900">
            <Undo2 aria-hidden className="size-4" />
          </span>
          Volver
        </button>
        <div className="glass rounded-xl px-3 py-1.5 leading-tight text-hud-foreground">
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-hud-muted">{eyebrow}</p>
          <h2 className="font-serif text-lg">{title}</h2>
        </div>
      </div>
    </motion.section>
  )
}