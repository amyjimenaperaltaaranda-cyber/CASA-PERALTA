'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useGame } from '@/components/game/game-provider'
import { FridgeExtras } from './fridge-extras'
import { NewProductDialog } from './new-product-dialog'
import { HamperLayer } from '@/components/laundry/hamper-layer'
import { BathroomMainView } from '@/components/bathroom/bathroom-main-view'
import { BATHROOM_IMAGE, type Point, SCENE_CENTER, ZOOM_ORIGIN } from '@/lib/scene'
import { FruitView } from './fruit-view'
import { LoginScreen } from './login-screen'
import { MainView } from './main-view'
import { PetsView } from './pets-view'
import { StockZoneView } from './stock-zone-view'

const ease = [0.65, 0, 0.35, 1] as const

// The exiting <MainView> is removed from the tree in the very same update that changes
// `lastZoom`, so a plain `style={{ transformOrigin }}` would always animate out using the
// *previous* click's point (it's baked in at the last render before removal — one click late).
// `originX`/`originY` are real Framer Motion transform values, so putting them inside the
// variant function lets AnimatePresence's `custom` prop re-evaluate them fresh at the moment
// the exit actually starts, instead of reusing a stale render.
// Framer Motion can resolve these functions with `custom` still undefined (e.g. when it reads the
// initial/base target before the presence context is populated), so each one falls back to the
// scene center instead of crashing on `origin.x`.
const mainVariants = {
  enter: (origin: Point = SCENE_CENTER) => ({ opacity: 0, scale: 2.2, originX: origin.x / 100, originY: origin.y / 100 }),
  visible: (origin: Point = SCENE_CENTER) => ({
    opacity: 1,
    scale: 1,
    originX: origin.x / 100,
    originY: origin.y / 100,
    transition: { duration: 0.6, ease },
  }),
  exit: (origin: Point = SCENE_CENTER) => ({
    opacity: 0,
    scale: 2.4,
    originX: origin.x / 100,
    originY: origin.y / 100,
    transition: { duration: 0.75, ease },
  }),
}

function Toast() {
  const { state, dispatch } = useGame()
  const toast = state.toast

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dispatch({ type: 'dismissToast', id: toast.id }), 3200)
    return () => clearTimeout(timer)
  }, [toast, dispatch])

  return (
    <div className="pointer-events-none absolute bottom-[14%] left-1/2 z-[90] -translate-x-1/2" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="glass rounded-full px-4 py-2 text-sm text-hud-foreground"
          >
            {toast.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export function KitchenScene() {
  const { state } = useGame()
  const { view, lastZoom } = state
  const origin = lastZoom ? ZOOM_ORIGIN[lastZoom] : SCENE_CENTER

  return (
    <main className="grid min-h-dvh place-items-center overflow-hidden bg-scene-letterbox">
      <h1 className="sr-only">Casa Peralta: inventario familiar en una cocina interactiva</h1>
      <div className="relative aspect-[1376/768] w-[min(100vw,calc(100dvh*1376/768))] select-none overflow-hidden">
        <AnimatePresence custom={origin}>
          {view === 'login' && <LoginScreen key="login" />}
          {view === 'main_kitchen' && (
            <motion.div
              key="main"
              className="absolute inset-0"
              custom={origin}
              variants={mainVariants}
              initial="enter"
              animate="visible"
              exit="exit"
            >
              <MainView />
            </motion.div>
          )}
          {view === 'zoomed_fridge' && (
            <StockZoneView key="fridge" view="zoomed_fridge" zone="fridge" src="/images/fridge-interior.png" ratio={896 / 1200} glow="rgba(200,230,255,0.9)" origin={origin} extras={<FridgeExtras />} />
          )}
          {view === 'zoomed_freezer' && (
            <StockZoneView key="freezer" view="zoomed_freezer" zone="freezer" src="/images/freezer.png" ratio={1678 / 937} glow="rgba(190,225,255,0.9)" origin={origin} />
          )}
          {view === 'zoomed_pantry' && (
            <StockZoneView key="pantry" view="zoomed_pantry" zone="pantry" src="/images/pantry-interior.png" ratio={768 / 1376} glow="rgba(255,210,150,0.9)" origin={origin} />
          )}
          {view === 'main_bathroom' && (
            <motion.div key="main-bath" className="absolute inset-0" custom={origin} variants={mainVariants} initial="enter" animate="visible" exit="exit">
              <BathroomMainView />
            </motion.div>
          )}
          {view === 'zoomed_cabinet' && <StockZoneView key="cabinet" view="zoomed_cabinet" zone="cabinet" src="/images/bathroom-cabinet.png" ratio={2 / 3} glow="rgba(255,200,120,0.9)" origin={origin} backdrop={BATHROOM_IMAGE} extras={<HamperLayer />} />}
          {view === 'zoomed_shelf' && <StockZoneView key="shelf" view="zoomed_shelf" zone="shelf" src="/images/bathroom-shelf.png" ratio={2 / 3} glow="rgba(255,190,100,0.9)" origin={origin} backdrop={BATHROOM_IMAGE} />}
          {view === 'zoomed_paper' && <StockZoneView key="paper" view="zoomed_paper" zone="paper" src="/images/toilet-paper.png" ratio={2 / 3} glow="rgba(255,220,170,0.9)" origin={origin} backdrop={BATHROOM_IMAGE} />}
          {view === 'zoomed_firstaid' && <StockZoneView key="firstaid" view="zoomed_firstaid" zone="firstaid" src="/images/first-aid.png" ratio={3 / 2} glow="rgba(255,190,100,0.9)" origin={origin} backdrop={BATHROOM_IMAGE} />}
          {view === 'zoomed_sink' && <StockZoneView key="sink" view="zoomed_sink" zone="sink" src="/images/bathroom-sink.png" ratio={2 / 3} glow="rgba(255,235,190,0.9)" origin={origin} backdrop={BATHROOM_IMAGE} />}
          {view === 'zoomed_cleaning' && <StockZoneView key="cleaning" view="zoomed_cleaning" zone="cleaning" src="/images/bathroom-cleaning.png" ratio={2 / 3} glow="rgba(255,210,150,0.9)" origin={origin} backdrop={BATHROOM_IMAGE} />}
          {view === 'zoomed_fruit' && <FruitView key="fruit" origin={origin} />}
          {view === 'zoomed_pets' && <PetsView key="pets" origin={origin} />}
        </AnimatePresence>
        <Toast />
        {view !== 'login' && <NewProductDialog />}
      </div>
    </main>
  )
}