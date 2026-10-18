'use client'

import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { levelLabel } from '@/lib/inventory'
import { zoneLevel } from '@/lib/lots'
import { FRIDGE_DOORS, MAIN_HOTSPOTS, PANTRY_DOORS, HISTORY_NOTE, rectStyle, SCENE_IMAGE, type ZoomView, VOICE_NOTE } from '@/lib/scene'
import { CabinetHotspot } from './cabinet-hotspot'
import { FruitBowlHotspot } from './fruit-bowl-hotspot'
import { HistoryPostIt } from './history-postit'
import { ActionCaption, InventoryHud, PlayerBadge } from './hud'
import { PetStation } from './pet-station'
import { LaundryAlert } from '@/components/laundry/laundry-alert'
import { RoomSwitch } from './room-switch'
import { UmbrellaPanel } from './umbrella-panel'

export function MainView() {
  const { state, dispatch } = useGame()
  const freezerLevel = zoneLevel('freezer', state.lots, state.today)
  const [hover, setHover] = useState<ZoomView | null>(null)
  const open = (view: ZoomView) => dispatch({ type: 'zoom', view })

  return (
    <div className="absolute inset-0">
      <img src={SCENE_IMAGE} alt="Cocina moderna y acogedora vista de frente" className="absolute inset-0 size-full" draggable={false} />

      <CabinetHotspot
        view="zoomed_fridge"
        zone="fridge"
        doors={FRIDGE_DOORS}
        interiorSrc="/images/fridge-interior.png"
        interiorRatio={896 / 1200}
        lightColor="rgba(200,230,255,0.9)"
        cardTitle="Refrigeradora"
        extraItems={[{ id: 'freezer', name: 'Carnes y congelados', label: levelLabel(freezerLevel), danger: freezerLevel <= 25 }]}
        cardStyle={{ left: '27%', top: '20%' }}
        active={hover === 'zoomed_fridge'}
        onHover={setHover}
        onOpen={open}
      />
      <CabinetHotspot
        view="zoomed_pantry"
        zone="pantry"
        doors={PANTRY_DOORS}
        interiorSrc="/images/pantry-interior.png"
        interiorRatio={768 / 1376}
        lightColor="rgba(255,210,150,0.9)"
        cardTitle="Alacena"
        cardStyle={{ right: '22%', top: '16%' }}
        active={hover === 'zoomed_pantry'}
        onHover={setHover}
        onOpen={open}
      />
      <FruitBowlHotspot active={hover === 'zoomed_fruit'} onHover={setHover} onOpen={open} />
      <PetStation active={hover === 'zoomed_pets'} onHover={setHover} onOpen={open} />
      <UmbrellaPanel />

      <motion.button
        type="button"
        aria-label="Post-it de compras por voz"
        onClick={() => dispatch({ type: 'toast', message: 'El registro de compras por voz llegará pronto' })}
        className="absolute z-30 flex cursor-pointer flex-col items-center justify-center gap-[6%] bg-yellow-300 text-stone-800 shadow-[0_6px_12px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{ ...rectStyle(VOICE_NOTE), rotate: -4 }}
        whileHover={{ scale: 1.12, rotate: 0 }}
        whileTap={{ scale: 0.96 }}
      >
        <span aria-hidden className="absolute -top-[6%] left-1/2 h-[14%] w-[55%] -translate-x-1/2 rotate-[-3deg] bg-white/60 shadow-sm" />
        <Mic aria-hidden className="size-[42%]" />
        <span className="text-[max(0.5rem,0.6vw)] font-medium leading-none">Voz</span>
      </motion.button>
      <HistoryPostIt rect={HISTORY_NOTE} />

      <div aria-hidden className="pointer-events-none absolute inset-0 z-40 shadow-[inset_0_0_120px_rgba(0,0,0,0.45)]" />

      <RoomSwitch to="bathroom" />
      <LaundryAlert />
      <PlayerBadge />
      <ActionCaption label={hover ? MAIN_HOTSPOTS[hover].label : null} />
      <InventoryHud />
    </div>
  )
}
