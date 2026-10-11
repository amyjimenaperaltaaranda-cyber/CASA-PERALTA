'use client'

import { Check, Copy, MessageCircle, ShoppingCart, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { Modal } from '@/components/ui/modal'
import { household } from '@/lib/inventory'
import { buildShoppingList, quickBuy, REASON_LABEL, type Room, type Reason, type ShopItem, shoppingText } from '@/lib/shopping'

const REASON_TONE: Record<Reason, string> = {
  out: 'text-hud-danger',
  expired: 'text-hud-danger',
  low: 'text-hud-warn',
  soon: 'text-hud-warn',
  expiring: 'text-hud-warn',
}

/** Botón del carrito con el número de cosas por comprar, y el panel con la lista. */
export function ShoppingButton() {
  const { state } = useGame()
  const [open, setOpen] = useState(false)
  const items = useMemo(() => buildShoppingList(state.lots, state.today), [state.lots, state.today])
  const urgent = items.some((item) => item.reason === 'out' || item.reason === 'expired')

  return (
    <>
      <button
        type="button"
        data-popover-trigger
        onClick={() => setOpen((value) => !value)}
        aria-label={`Lista de compras: ${items.length} pendientes`}
        className="glass relative flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm text-hud-foreground outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200/70"
      >
        <span className="grid size-7 place-items-center rounded-full bg-amber-200/90 text-stone-900">
          <ShoppingCart aria-hidden className="size-4" />
        </span>
        Compras
        {items.length > 0 && (
          <span className={`grid min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-semibold tabular-nums text-stone-950 ${urgent ? 'bg-hud-danger' : 'bg-hud-warn'}`}>{items.length}</span>
        )}
      </button>
      {open && <ShoppingPanel items={items} onClose={() => setOpen(false)} />}
    </>
  )
}

function ShoppingPanel({ items, onClose }: { items: ShopItem[]; onClose: () => void }) {
  const { state, dispatch } = useGame()
  const [copied, setCopied] = useState(false)
  const text = shoppingText(items, household, state.today)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      dispatch({ type: 'toast', message: 'No se pudo copiar la lista' })
    }
  }

  return (
    <Modal label="Lista de compras" onClose={onClose} maxWidth="max-w-[30rem]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-hud-muted">{household}</p>
            <h2 className="font-serif text-2xl leading-tight">Lista de compras</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full text-hud-muted transition hover:bg-white/10 hover:text-hud-foreground">
            <X className="size-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 pb-4 text-center text-sm text-hud-muted">Todo en orden: no falta nada por ahora.</p>
        ) : (
          <>
            <div className="mt-3 flex-1 overflow-y-auto pr-1">
              {(['Cocina', 'Baño'] as Room[]).map((room) => {
                const list = items.filter((item) => item.room === room)
                if (!list.length) return null
                return (
                  <section key={room} className="mb-3">
                    <h3 className="mb-1.5 border-b border-white/10 pb-1 text-[0.65rem] font-medium uppercase tracking-[0.22em] text-hud-muted">
                      {room} · {list.length}
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {list.map((item) => (
                        <li key={item.article.id} className="rounded-lg bg-white/6 p-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="min-w-0 truncate text-sm">{item.article.name}</span>
                            <span className={`shrink-0 text-[0.7rem] font-medium ${REASON_TONE[item.reason]}`}>{REASON_LABEL[item.reason]}</span>
                          </div>
                          <p className="text-[0.7rem] text-hud-muted">{item.detail}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="text-[0.6rem] uppercase tracking-[0.16em] text-hud-muted">Ya compré</span>
                            {item.article.buy.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => dispatch(quickBuy(item.article, option, state.lots))}
                                className="rounded-lg bg-white/10 px-2 py-1 text-[0.7rem] ring-1 ring-white/15 transition hover:bg-amber-200/25 hover:ring-amber-200/60 active:scale-95"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
            <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
              <button type="button" onClick={copy} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/20 active:scale-[0.98]">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copiada' : 'Copiar lista'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-200/25 px-3 py-2 text-xs ring-1 ring-amber-200/50 transition hover:bg-amber-200/35 active:scale-[0.98]"
              >
                <MessageCircle className="size-4" />
                Enviar por WhatsApp
              </a>
            </div>
          </>
        )}
    </Modal>
  )
}
