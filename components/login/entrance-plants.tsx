'use client'

import { animate, AnimatePresence, motion, useAnimationControls, useMotionValue, type PanInfo } from 'framer-motion'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AuthError, signInAdminWithGoogle } from '@/lib/auth'
import { family, type FamilyMember } from '@/lib/inventory'
import { rectStyle } from '@/lib/scene'
import { ADMIN_KEY, PLANT_IMAGE, PLANT_LEFT, PLANT_RIGHT } from './door-layout'

const admin = family.find((member) => member.access === 'admin')!
const spring = { type: 'spring', stiffness: 260, damping: 26 } as const

/** Cuánto se desplaza la maceta derecha al apartarla (fracción de su ancho, hacia la izquierda). */
const OPEN_SHIFT = 0.75
/** La de la izquierda solo cede un poco y vuelve: no esconde nada. */
const TEASE_SHIFT = 0.22

type EntrancePlantsProps = {
  /** solo se puede jugar con las macetas con la escena quieta (sin zoom ni puerta abriéndose) */
  enabled: boolean
  onCaption: (text: string) => void
  onAdminSuccess: (member: FamilyMember) => void
}

/** Macetas de la entrada: la derecha esconde la llave de Amy; la izquierda es un easter egg. */
export function EntrancePlants({ enabled, onCaption, onAdminSuccess }: EntrancePlantsProps) {
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)

  // Mismo flujo administrativo que tenía la llave familiar: solo cambia el punto de entrada.
  // Descubrir la llave no concede nada; la validación de la cuenta sigue en signInAdminWithGoogle().
  const signInAdmin = async () => {
    if (busy) return
    setBusy(true)
    try {
      await signInAdminWithGoogle()
      onAdminSuccess(admin)
    } catch (error) {
      if (!(error instanceof AuthError && error.code === 'cancelled')) {
        onCaption(error instanceof AuthError ? error.message : 'No se pudo iniciar sesión con Google.')
      }
      setBusy(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {revealed && (
          <motion.button
            key="admin-key"
            type="button"
            aria-label="Llave de Amy · Administradora: entrar con Google"
            onClick={signInAdmin}
            disabled={busy || !enabled}
            className="absolute z-10 flex cursor-pointer flex-col items-center justify-end gap-[6%] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-default"
            style={rectStyle(ADMIN_KEY)}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring, delay: 0.12 } }}
            exit={{ opacity: 0, y: 6, scale: 0.85, transition: { duration: 0.18 } }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
          >
            <motion.span
              aria-hidden
              className="grid place-items-center text-amber-300 drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]"
              animate={{ rotate: [-8, 6, -8] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {busy ? <LoaderCircle className="size-[clamp(14px,1.6vw,26px)] animate-spin" /> : <KeyRound className="size-[clamp(14px,1.6vw,26px)]" />}
            </motion.span>
            <span className="glass whitespace-nowrap rounded-full px-2 py-0.5 text-[clamp(9px,0.75vw,12px)] font-medium text-hud-foreground">
              Amy · Administradora
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <MovablePlant
        rect={PLANT_RIGHT}
        flip
        direction={-1}
        shift={OPEN_SHIFT}
        enabled={enabled}
        label={revealed ? 'Maceta apartada: devolverla a su sitio' : 'Mover la maceta de la derecha'}
        moved={revealed}
        onMovedChange={setRevealed}
      />
      <MovablePlant
        rect={PLANT_LEFT}
        direction={1}
        shift={TEASE_SHIFT}
        enabled={enabled}
        label="Mover la maceta de la izquierda"
        tease
        onTease={() => onCaption('¿Qué buscas, mirón? 👀')}
      />
    </>
  )
}

type MovablePlantProps = {
  rect: typeof PLANT_RIGHT
  flip?: boolean
  /** -1: se aparta hacia la izquierda; 1: hacia la derecha */
  direction: 1 | -1
  shift: number
  enabled: boolean
  label: string
  /** maceta que se queda apartada (la de la llave) */
  moved?: boolean
  onMovedChange?: (moved: boolean) => void
  /** maceta que siempre vuelve a su sitio y solo muestra un mensaje */
  tease?: boolean
  onTease?: () => void
}

function MovablePlant({ rect, flip, direction, shift, enabled, label, moved = false, onMovedChange, tease, onTease }: MovablePlantProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [width, setWidth] = useState(0)
  const x = useMotionValue(0)
  const wiggle = useAnimationControls()
  const dragged = useRef(false)

  // Ancho real en pantalla (sin la transformación de la cámara) para convertir la fracción en píxeles.
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const target = moved && !tease ? direction * width * shift : 0
  // Centro del plato en la imagen (48 % de su ancho; 52 % si está espejada). La luz del sol entra por arriba a la
  // derecha (ver las sombras de hojas en la pared), así que las dos sombras caen hacia la izquierda.
  const saucerCenter = flip ? 52 : 48
  const shadowSide = -1
  // Recoloca la maceta si cambia su estado o el tamaño de la escena.
  useEffect(() => {
    const controls = animate(x, target, spring)
    return () => controls.stop()
  }, [target, x])

  const settle = (next: boolean) => {
    // El mismo temblorcito para las dos macetas, al soltarlas o tocarlas.
    void wiggle.start({ rotate: [0, -3, 3, -2, 0], transition: { duration: 0.5 } })
    if (tease) {
      animate(x, 0, spring)
      onTease?.()
      return
    }
    if (next === moved) animate(x, target, spring) // gesto cancelado: vuelve a donde estaba
    else onMovedChange?.(next)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const travelled = (x.get() * direction) / Math.max(width * shift, 1)
    // Basta con recorrer un tercio (o un buen empujón) para apartarla; al revés para devolverla.
    const flick = info.velocity.x * direction
    if (tease) settle(true)
    else if (!moved) settle(travelled > 0.35 || flick > 500)
    else settle(!(travelled < 0.65 || flick < -500))
  }

  return (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={tease ? undefined : moved}
      disabled={!enabled}
      className="absolute z-20 cursor-grab touch-none select-none outline-none active:cursor-grabbing disabled:cursor-default focus-visible:[&>img]:drop-shadow-[0_0_6px_rgba(253,230,138,0.95)]"
      style={{ ...rectStyle(rect), x }}
      drag={enabled ? 'x' : false}
      dragConstraints={direction < 0 ? { left: -width * shift * 1.05, right: 0 } : { left: 0, right: width * shift * 1.05 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={() => {
        dragged.current = true
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        // Un arrastre también dispara click al soltar: solo cuenta el toque/clic o Enter/Espacio.
        if (dragged.current) {
          dragged.current = false
          return
        }
        settle(!moved)
      }}
    >
      {/* Sombra proyectada en la pared: la silueta de la propia planta, oscura y difuminada, desplazada a la izquierda. */}
      <img
        src={PLANT_IMAGE}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 size-full opacity-[0.45] mix-blend-multiply"
        style={{
          // Sin desplazar la base: la sombra nace al pie de la maceta y solo se inclina (pivote abajo), así enlaza con la del suelo.
          transform: `skewX(${shadowSide * -24}deg) scaleX(${flip ? -1 : 1})`,
          transformOrigin: '50% 100%',
          filter: 'brightness(0) blur(3px)',
        }}
      />
      {/* Sombras del suelo. `closest-side` hace que el degradado llegue a 0 justo en el borde de su caja: con el valor
          por defecto (farthest-corner) la caja lo cortaba aún semiopaco y se veía una franja separada de la maceta.
          Las dos están centradas verticalmente en la base del plato, así la sombra nace pegada a él. */}
      {/* Difusa: más ancha y corrida hacia la izquierda, enlaza con la sombra de la pared. */}
      <span
        aria-hidden
        className="pointer-events-none absolute mix-blend-multiply"
        style={{
          left: `${saucerCenter - 36 + shadowSide * 10}%`,
          width: '72%',
          bottom: '-5%',
          height: '10%',
          background: 'radial-gradient(closest-side, rgba(40,24,14,0.42), rgba(40,24,14,0.2) 55%, transparent)',
        }}
      />
      {/* Contacto: estrecha y oscura, justo bajo el plato. */}
      <span
        aria-hidden
        className="pointer-events-none absolute mix-blend-multiply"
        style={{
          left: `${saucerCenter - 24}%`,
          width: '48%',
          bottom: '-3.5%',
          height: '7%',
          background: 'radial-gradient(closest-side, rgba(35,20,10,0.85), rgba(35,20,10,0.55) 50%, transparent)',
        }}
      />
      <motion.img
        src={PLANT_IMAGE}
        alt=""
        draggable={false}
        animate={wiggle}
        className="pointer-events-none relative size-full"
        // Tono ligeramente cálido y menos saturado para integrarla con la luz de los faroles de la ilustración.
        style={{ transformOrigin: '50% 95%', scaleX: flip ? -1 : 1, filter: 'saturate(0.85) sepia(0.12) brightness(0.97) drop-shadow(0 2px 2px rgba(30,18,10,0.35))' }}
      />
    </motion.button>
  )
}
