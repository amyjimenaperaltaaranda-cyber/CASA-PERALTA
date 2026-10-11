'use client'

import { motion } from 'framer-motion'
import { useGame } from '@/components/game/game-provider'
import { articlesOf, shelves } from '@/lib/catalog'
import { levelLabel, type StockZone } from '@/lib/inventory'
import { summarizeShelf } from '@/lib/lots'
import { MAIN_HOTSPOTS, type Rect, rectStyle, SCENE_ASPECT, SCENE_IMAGE, sceneSliceStyle, type ZoomView } from '@/lib/scene'
import { GlassCard } from './glass-card'

type CabinetHotspotProps = {
  view: ZoomView
  zone: StockZone
  /** imagen de la escena donde están las puertas (cocina por defecto) */
  sceneSrc?: string
  doors: [Rect, Rect]
  interiorSrc: string
  /** width / height of the interior illustration */
  interiorRatio: number
  lightColor: string
  cardTitle: string
  /** filas adicionales en la tarjeta (p. ej. canastas de ropa sucia) */
  extraItems?: { id: string; name: string; label: string; danger: boolean }[]
  cardStyle: React.CSSProperties
  active: boolean
  /** 'cover' (por defecto) llena el hueco del mueble recortando el lado que sobre; 'contain' nunca recorta, deja a lo mucho una banda oscura (útil si la interior no calza exacto con el hueco real). */
  fit?: 'cover' | 'contain'
  onHover: (view: ZoomView | null) => void
  onOpen: (view: ZoomView) => void
}

const doorSpring = { type: 'spring', stiffness: 70, damping: 16, mass: 0.9 } as const

export function CabinetHotspot({ sceneSrc, view, zone, doors, interiorSrc, interiorRatio, lightColor, cardTitle, extraItems, cardStyle, active, fit = 'cover', onHover, onOpen }: CabinetHotspotProps) {
  const { state } = useGame()
  const [left, right] = doors
  const bounds: Rect = { x: left.x, y: left.y, w: left.w + right.w, h: left.h }
  const spot = MAIN_HOTSPOTS[view]
  const zoneShelves = shelves.filter((item) => item.zone === zone && articlesOf(item.id).length > 0)
  const items = zoneShelves.map((shelf) => ({ id: shelf.id, name: shelf.name, level: summarizeShelf(shelf, state.lots, state.today).level }))
  // 'cover' llena el hueco por completo recortando el lado que sobre; 'contain' hace exactamente lo opuesto
  // (nunca recorta, deja a lo mucho una banda oscura) usando la MISMA comparación pero invertida — nunca
  // 'auto'/'auto' sin medida concreta, porque el hijo va con position:absolute y no le da tamaño al padre.
  const coverWidthFit = (bounds.w / bounds.h) * SCENE_ASPECT >= interiorRatio
  const widthFit = fit === 'contain' ? !coverWidthFit : coverWidthFit

  return (
    <>
      {/* interior + doors (purely visual) */}
      <div aria-hidden className="pointer-events-none absolute z-10 [perspective:1400px]" style={rectStyle(bounds)}>
        <div className="absolute inset-0 overflow-hidden rounded-[2px] bg-black">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="relative shrink-0"
              style={{
                aspectRatio: interiorRatio,
                width: widthFit ? '100%' : 'auto',
                height: widthFit ? 'auto' : '100%',
              }}
              initial={false}
              animate={{ scale: active ? 1 : 1.06, filter: active ? 'brightness(1)' : 'brightness(0.25)' }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <img src={interiorSrc} alt="" className="absolute inset-0 size-full" draggable={false} />
              {zoneShelves
                .filter((item) => item.image)
                .map((item) => (
                  <img key={item.id} src={item.image} alt="" className="absolute object-contain drop-shadow-[0_3px_3px_rgba(0,0,0,0.4)]" style={rectStyle(item.rect)} draggable={false} />
                ))}
            </motion.div>
          </div>
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${lightColor}, transparent 70%)` }}
            initial={false}
            animate={{ opacity: active ? 0.55 : 0 }}
            transition={{ duration: 0.6, delay: active ? 0.2 : 0 }}
          />
          <div className="absolute inset-0 shadow-[inset_0_0_24px_rgba(0,0,0,0.65)]" />
        </div>
        <Door rect={left} bounds={bounds} hinge="left" open={active} src={sceneSrc ?? SCENE_IMAGE} />
        <Door rect={right} bounds={bounds} hinge="right" open={active} src={sceneSrc ?? SCENE_IMAGE} />
      </div>

      {/* light spilling out */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-10"
        style={{
          ...rectStyle({ x: bounds.x - 4, y: bounds.y - 2, w: bounds.w + 8, h: bounds.h + 12 }),
          background: `radial-gradient(ellipse at 50% 55%, ${lightColor}, transparent 65%)`,
          mixBlendMode: 'screen',
        }}
        initial={false}
        animate={{ opacity: active ? 0.35 : 0 }}
        transition={{ duration: 0.6 }}
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

      <GlassCard open={active} eyebrow="Inventario · clic para acercarte" title={cardTitle} style={cardStyle}>
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
          {extraItems?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={item.danger ? 'size-1.5 rounded-full bg-hud-danger' : 'size-1.5 rounded-full bg-hud-ok'} />
                {item.name}
              </span>
              <span className={item.danger ? 'tabular-nums text-hud-danger' : 'tabular-nums text-hud-muted'}>{item.label}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </>
  )
}

function Door({ rect, bounds, hinge, open, src }: { rect: Rect; bounds: Rect; hinge: 'left' | 'right'; open: boolean; src: string }) {
  const localLeft = ((rect.x - bounds.x) / bounds.w) * 100
  const localWidth = (rect.w / bounds.w) * 100
  const angle = hinge === 'left' ? -78 : 78

  return (
    <motion.div
      className="absolute top-0 h-full [transform-style:preserve-3d]"
      style={{
        left: `${localLeft}%`,
        width: `${localWidth}%`,
        transformOrigin: hinge === 'left' ? 'left center' : 'right center',
        ...sceneSliceStyle(rect, src),
      }}
      initial={false}
      animate={{ rotateY: open ? angle : 0 }}
      transition={doorSpring}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            hinge === 'left'
              ? 'linear-gradient(to left, rgba(0,0,0,0.55), rgba(0,0,0,0.1))'
              : 'linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.1))',
        }}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  )
}
