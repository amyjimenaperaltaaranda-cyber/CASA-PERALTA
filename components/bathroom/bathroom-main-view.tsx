'use client'

import { motion } from 'framer-motion'
import { type CSSProperties, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { CabinetHotspot } from '@/components/kitchen/cabinet-hotspot'
import { GlassCard } from '@/components/kitchen/glass-card'
import { ActionCaption, PlayerBadge } from '@/components/kitchen/hud'
import { LaundryAlert } from '@/components/laundry/laundry-alert'
import { RoomSwitch } from '@/components/kitchen/room-switch'
import { hamperDefs, hamperStatus } from '@/lib/hampers'
import { articlesOf, shelves } from '@/lib/catalog'
import { levelLabel, type StockZone } from '@/lib/inventory'
import { summarizeShelf } from '@/lib/lots'
import { BATH_CABINET_DOORS, BATHROOM_IMAGE, CLEAN_DOORS, MAIN_HOTSPOTS, rectStyle, SINK_DOORS, type ZoomView } from '@/lib/scene'

/** Mueble abierto (sin puertas): se resalta al pasar el cursor y muestra su resumen. */
function OpenHotspot({ view, zone, title, cardStyle, active, onHover, onOpen }: { view: ZoomView; zone: StockZone; title: string; cardStyle: CSSProperties; active: boolean; onHover: (view: ZoomView | null) => void; onOpen: (view: ZoomView) => void }) {
  const { state } = useGame()
  const spot = MAIN_HOTSPOTS[view]
  const items = shelves.filter((shelf) => shelf.zone === zone && articlesOf(shelf.id).length > 0).map((shelf) => ({ id: shelf.id, name: shelf.name, level: summarizeShelf(shelf, state.lots, state.today).level }))
  return (
    <>
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute z-10 ${spot.shape}`}
        style={{ ...rectStyle(spot.rect), boxShadow: '0 0 0 2px rgba(255,220,150,0.75), 0 0 30px rgba(255,200,110,0.55)' }}
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      <button
        type="button"
        aria-label={spot.label}
        onClick={() => onOpen(view)}
        onMouseEnter={() => onHover(view)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(view)}
        onBlur={() => onHover(null)}
        className={`absolute z-20 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 ${spot.shape}`}
        style={rectStyle(spot.rect)}
      />
      <GlassCard open={active} eyebrow="Inventario · clic para acercarte" title={title} style={cardStyle}>
        <ul className="flex flex-col gap-1 text-xs">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={item.level <= 25 ? 'size-1.5 rounded-full bg-hud-danger' : 'size-1.5 rounded-full bg-hud-ok'} />
                {item.name}
              </span>
              <span className="tabular-nums text-hud-muted">{levelLabel(item.level)}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </>
  )
}

export function BathroomMainView() {
  const { state, dispatch } = useGame()
  const hamperItems = hamperDefs.flatMap((def) => {
    const hamper = state.hampers.find((entry) => entry.id === def.id)
    if (!hamper) return []
    const status = hamperStatus(hamper, state.today)
    return [{ id: def.id, name: `Ropa sucia · ${def.name}`, label: status.tone === 'urgent' ? 'Llena · lavar' : hamper.level === 0 ? 'Vacía' : `${hamper.level}%`, danger: status.tone === 'urgent' }]
  })
  const [hover, setHover] = useState<ZoomView | null>(null)
  const open = (view: ZoomView) => dispatch({ type: 'zoom', view })

  return (
    <div className="absolute inset-0">
      <img src={BATHROOM_IMAGE} alt="Baño con gabinete, estante, lavabo y área de limpieza" className="absolute inset-0 size-full" draggable={false} />

      <CabinetHotspot
        sceneSrc={BATHROOM_IMAGE}
        view="zoomed_cabinet"
        zone="cabinet"
        doors={BATH_CABINET_DOORS}
        interiorSrc="/images/cabinet-preview.png"
        interiorRatio={680 / 1310}
        lightColor="rgba(255,200,120,0.9)"
        cardTitle="Gabinete de toallas"
        extraItems={hamperItems}
        cardStyle={{ left: '23%', top: '14%' }}
        active={hover === 'zoomed_cabinet'}
        onHover={setHover}
        onOpen={open}
      />
      <CabinetHotspot
        sceneSrc={BATHROOM_IMAGE}
        view="zoomed_sink"
        zone="sink"
        doors={SINK_DOORS}
        interiorSrc="/images/sink-preview.png"
        interiorRatio={690 / 550}
        lightColor="rgba(255,235,190,0.9)"
        cardTitle="Lavabo"
        cardStyle={{ left: '58.5%', top: '42%' }}
        active={hover === 'zoomed_sink'}
        onHover={setHover}
        onOpen={open}
      />
      <CabinetHotspot
        sceneSrc={BATHROOM_IMAGE}
        view="zoomed_cleaning"
        zone="cleaning"
        doors={CLEAN_DOORS}
        interiorSrc="/images/cleaning-preview.png"
        interiorRatio={595 / 400}
        lightColor="rgba(255,210,150,0.9)"
        cardTitle="Área de limpieza"
        cardStyle={{ right: '38%', top: '36%' }}
        active={hover === 'zoomed_cleaning'}
        onHover={setHover}
        onOpen={open}
      />
      <OpenHotspot view="zoomed_shelf" zone="shelf" title="Estante del baño" cardStyle={{ left: '42%', top: '22%' }} active={hover === 'zoomed_shelf'} onHover={setHover} onOpen={open} />
      <OpenHotspot view="zoomed_paper" zone="paper" title="Papel higiénico" cardStyle={{ left: '40%', top: '8%' }} active={hover === 'zoomed_paper'} onHover={setHover} onOpen={open} />
      <OpenHotspot view="zoomed_firstaid" zone="firstaid" title="Botiquín" cardStyle={{ left: '32%', top: '48%' }} active={hover === 'zoomed_firstaid'} onHover={setHover} onOpen={open} />

      <div aria-hidden className="pointer-events-none absolute inset-0 z-40 shadow-[inset_0_0_120px_rgba(0,0,0,0.45)]" />

      <RoomSwitch to="kitchen" />
      <LaundryAlert />
      <PlayerBadge />
      <ActionCaption label={hover ? MAIN_HOTSPOTS[hover].label : null} />
    </div>
  )
}
