'use client'

import { AnimatePresence, motion, type TargetAndTransition } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '@/components/game/game-provider'
import { LeafArt, WallArt } from '@/components/login/door-art'
import { DOOR_CENTER, DOORBELL, HANDLE_RECT, KEYHOLE, LEAF_RECT, MAILBOX, W, ZOOM_SCALE } from '@/components/login/door-layout'
import { EntrancePlants } from '@/components/login/entrance-plants'
import { KeyPanel } from '@/components/login/key-panel'
import type { FamilyMember } from '@/lib/inventory'
import { rectStyle, SCENE_IMAGE } from '@/lib/scene'

type Phase = 'idle' | 'zooming' | 'key' | 'leaving' | 'opening1' | 'opening2'

const ease = [0.65, 0, 0.35, 1] as const
const ZOOM_SHIFT = { x: `${50 - KEYHOLE.x}%`, y: `${50 - KEYHOLE.y}%` }

const camera: Record<Phase, TargetAndTransition> = {
  idle: { scale: 1, x: '0%', y: '0%', filter: 'blur(0px) brightness(1)', transition: { duration: 0.9, ease } },
  leaving: { scale: 1, x: '0%', y: '0%', filter: 'blur(0px) brightness(1)', transition: { duration: 0.9, ease } },
  zooming: { scale: ZOOM_SCALE, ...ZOOM_SHIFT, filter: 'blur(0px) brightness(1)', transition: { duration: 1.1, ease } },
  key: { scale: ZOOM_SCALE, ...ZOOM_SHIFT, filter: 'blur(6px) brightness(0.5)', transition: { duration: 0.6 } },
  opening1: { scale: 1, x: '0%', y: '0%', filter: 'blur(0px) brightness(1)', transition: { duration: 0.8, ease } },
  opening2: { scale: 2.7, x: '0%', y: '0%', filter: 'blur(0px) brightness(1)', transition: { duration: 1.5, delay: 0.25, ease } },
}

const pct = (point: { x: number; y: number }) => `${point.x}% ${point.y}%`

export function LoginScreen() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState<Phase>('idle')
  const [caption, setCaption] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const rootRef = useRef<HTMLElement>(null)
  const pending = useRef<FamilyMember | null>(null)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!caption) return
    const timer = setTimeout(() => setCaption(null), 2200)
    return () => clearTimeout(timer)
  }, [caption])

  const onCameraDone = () => {
    if (phase === 'zooming') setPhase('key')
    else if (phase === 'leaving') setPhase('idle')
    else if (phase === 'opening1') setPhase('opening2')
    else if (phase === 'opening2' && pending.current) dispatch({ type: 'login', member: pending.current })
  }

  const onSuccess = useCallback((member: FamilyMember) => {
    pending.current = member
    setPhase('opening1')
  }, [])
  const onBack = useCallback(() => setPhase('leaving'), [])
  // La llave secreta se usa sin acercarse a la cerradura: la cámara ya está en reposo, así que se pasa directo a abrir la puerta.
  const onAdminSuccess = useCallback((member: FamilyMember) => {
    pending.current = member
    setPhase('opening2')
  }, [])

  const idle = phase === 'idle'
  const open = phase === 'opening2'
  const origin = phase === 'opening1' || phase === 'opening2' ? DOOR_CENTER : KEYHOLE

  return (
    <motion.section
      ref={rootRef}
      aria-label="Puerta de entrada"
      className="absolute inset-0 overflow-hidden bg-black"
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: pct(origin) }}
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ ...camera[phase], opacity: 1 }}
        onAnimationComplete={onCameraDone}
      >
        <WallArt />

        {/* what lies behind the door */}
        <div className="absolute overflow-hidden" style={rectStyle(LEAF_RECT)}>
          <img src={SCENE_IMAGE} alt="" className="size-full object-cover" draggable={false} />
          <motion.div
            className="absolute inset-0 bg-amber-100"
            style={{ mixBlendMode: 'soft-light' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: open ? 0.5 : 0 }}
            transition={{ duration: 1.2 }}
          />
        </div>

        {/* door leaf, hinged on the left */}
        <div className="absolute [perspective:1400px]" style={rectStyle(LEAF_RECT)}>
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{ transformOrigin: 'left center' }}
            initial={false}
            animate={{ rotateY: open ? -108 : 0 }}
            transition={{ duration: 1.3, delay: 0.3, ease }}
          >
            <LeafArt />
            <button
              type="button"
              aria-label="Tocar la manija de la puerta"
              disabled={!idle}
              onClick={() => setPhase('zooming')}
              className="absolute z-10 cursor-pointer rounded-full outline-none disabled:cursor-default focus-visible:ring-2 focus-visible:ring-amber-200"
              style={rectStyle(HANDLE_RECT)}
            >
              <motion.span
                aria-hidden
                className="absolute left-1/2 top-[30%] size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,232,160,0.95), rgba(255,210,110,0) 70%)', mixBlendMode: 'screen' }}
                animate={idle ? { scale: [0.9, 1.8, 0.9], opacity: [0.9, 0.15, 0.9] } : { opacity: 0 }}
                transition={{ duration: 2.2, repeat: idle ? Infinity : 0, ease: 'easeInOut' }}
              />
            </button>
          </motion.div>
        </div>

        <button
          type="button"
          aria-label="Buzón"
          disabled={!idle}
          onClick={() => setCaption('El buzón está vacío por hoy ✉️')}
          className="absolute cursor-pointer rounded-lg outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200"
          style={rectStyle(MAILBOX)}
        />
        <button
          type="button"
          aria-label="Timbre"
          disabled={!idle}
          onClick={() => setCaption('Ding-dong 🔔 … nadie contesta, mejor usa la llave')}
          className="absolute cursor-pointer rounded-lg outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-amber-200"
          style={rectStyle(DOORBELL)}
        />

        <EntrancePlants enabled={idle} onCaption={setCaption} onAdminSuccess={onAdminSuccess} />
      </motion.div>

      {/* captions */}
      <div className="pointer-events-none absolute inset-x-0 top-[4%] z-20 flex flex-col items-center gap-2" aria-live="polite">
        {idle && (
          <p className="glass rounded-full px-5 py-2 font-serif text-lg text-hud-foreground">Casa Peralta · toca la manija para entrar</p>
        )}
        {caption && <p className="glass rounded-full px-4 py-1.5 text-sm text-hud-foreground">{caption}</p>}
      </div>

      {/* key-shaped glass panel */}
      <AnimatePresence>
        {phase === 'key' && (
          <div key="panel" className="absolute left-1/2 top-1/2 z-30" style={{ transform: `translate(-50%, -50%) scale(${Math.min(scale, 1.05)})` }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30, rotateZ: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateZ: 0 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.3 } }}
              transition={{ type: 'spring', stiffness: 110, damping: 15 }}
            >
              <KeyPanel onSuccess={onSuccess} onBack={onBack} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
