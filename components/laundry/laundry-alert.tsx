'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Shirt } from 'lucide-react'
import { useGame } from '@/components/game/game-provider'
import { hamperDef, joinNames, urgentHampers } from '@/lib/hampers'

/** Aviso flotante cuando hay canastas llenas: un clic lleva al gabinete de toallas y ropa. */
export function LaundryAlert() {
  const { state, dispatch } = useGame()
  const urgent = urgentHampers(state.hampers)
  const names = joinNames(urgent.map((entry) => hamperDef(entry.id)?.name ?? entry.id))

  return (
    <div className="absolute left-1/2 top-[10.5%] z-50 -translate-x-1/2">
      <AnimatePresence>
        {urgent.length > 0 && (
          <motion.button
            type="button"
            onClick={() => dispatch({ type: 'zoom', view: 'zoomed_cabinet' })}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-xs text-hud-foreground outline-none ring-1 ring-hud-danger/70 transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/80"
          >
            <motion.span
              aria-hidden
              className="grid size-7 place-items-center rounded-full bg-hud-danger text-stone-950"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shirt className="size-4" />
            </motion.span>
            <span>
              <strong className="font-semibold">Lavar con urgencia:</strong> {urgent.length === 1 ? `canasta de ${names}` : `canastas de ${names}`} llena{urgent.length === 1 ? '' : 's'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
