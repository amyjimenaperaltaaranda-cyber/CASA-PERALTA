'use client'

import { type RefObject, useEffect, useRef } from 'react'

/**
 * Closes floating UI on outside pointer-down or Escape.
 * Elements marked `data-popover-trigger` are ignored so their own click can toggle.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const latest = useRef(onDismiss)
  latest.current = onDismiss

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (ref.current?.contains(target) || target.closest('[data-popover-trigger]')) return
      latest.current()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [ref])
}
