'use client'

import { motion } from 'framer-motion'
import { type ReactNode, useEffect, useRef } from 'react'

/**
 * Ventana modal en la "capa superior" del navegador (<dialog>.showModal()).
 * Queda siempre por encima de la escena —puertas 3D, notas, tarjetas— sin depender de z-index,
 * atenúa el fondo y atrapa el foco. Se cierra con Escape o tocando fuera.
 */
export function Modal({ label, onClose, children, maxWidth = 'max-w-lg' }: { label: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-0 size-full max-h-none max-w-none border-0 bg-transparent p-4 text-hud-foreground outline-none backdrop:bg-black/60 backdrop:backdrop-blur-[3px]"
    >
      <div
        className="flex size-full items-center justify-center"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className={`glass flex max-h-[88dvh] w-full ${maxWidth} flex-col rounded-2xl p-4`}
        >
          {children}
        </motion.div>
      </div>
    </dialog>
  )
}
