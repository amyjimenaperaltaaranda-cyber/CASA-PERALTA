'use client'

import { Bath, Plus, Utensils } from 'lucide-react'
import { useGame } from '@/components/game/game-provider'
import { urgentHampers } from '@/lib/hampers'
import { ShoppingButton } from './shopping-list'

/** Barra superior derecha: lista de compras + cambio de habitación (cocina ↔ baño). */
export function RoomSwitch({ to }: { to: 'kitchen' | 'bathroom' }) {
  const { state, dispatch } = useGame()
  const Icon = to === 'bathroom' ? Bath : Utensils
  const alert = to === 'bathroom' && urgentHampers(state.hampers).length > 0
  return (
    <div className="absolute right-[1.5%] top-[2.5%] z-[60] flex items-center gap-2">
      <button
        type="button"
        onClick={() => dispatch({ type: 'openNewProduct' })}
        className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/70"
      >
        <span className="grid size-7 place-items-center rounded-full bg-amber-200/90 text-stone-900">
          <Plus aria-hidden className="size-4" />
        </span>
        Nuevo
      </button>
      <ShoppingButton />
      <button
        type="button"
        onClick={() => dispatch({ type: 'goto', view: to === 'bathroom' ? 'main_bathroom' : 'main_kitchen' })}
        className="glass relative flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/70"
      >
        <span className="grid size-7 place-items-center rounded-full bg-amber-200/90 text-stone-900">
          <Icon aria-hidden className="size-4" />
        </span>
        {to === 'bathroom' ? 'Ir al baño' : 'Ir a la cocina'}
        {alert && <span aria-label="Hay ropa por lavar" className="absolute -right-0.5 -top-0.5 size-3 animate-pulse rounded-full bg-hud-danger ring-2 ring-black/40" />}
      </button>
    </div>
  )
}
