'use client'

import { Snowflake } from 'lucide-react'
import { useGame } from '@/components/game/game-provider'

/** Sobre la ilustración de la refri: la puerta al congelador (carnes y congelados). */
export function FridgeExtras() {
  const { dispatch } = useGame()
  return (
    <>
      <button
        type="button"
        onClick={() => dispatch({ type: 'zoom', view: 'zoomed_freezer' })}
        className="glass absolute bottom-[0.8%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full py-1 pl-1.5 pr-3.5 text-xs text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-200/70"
      >
        <span className="grid size-6 place-items-center rounded-full bg-sky-200/90 text-stone-900">
          <Snowflake aria-hidden className="size-3.5" />
        </span>
        Carnes y congelados
      </button>
    </>
  )
}
