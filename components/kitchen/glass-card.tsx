'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type GlassCardProps = {
  open: boolean
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function GlassCard({ open, title, eyebrow, children, className, style }: GlassCardProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          style={style}
          className={cn(
            'glass pointer-events-none absolute z-40 w-[clamp(9.5rem,15vw,14rem)] rounded-xl p-3 text-hud-foreground',
            className,
          )}
        >
          {eyebrow && (
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-hud-muted">{eyebrow}</p>
          )}
          <p className="font-serif text-base leading-tight">{title}</p>
          <div className="mt-2 border-t border-white/10 pt-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
