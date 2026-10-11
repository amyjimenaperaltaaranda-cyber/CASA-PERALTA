import type { Rect } from '@/lib/scene'

/** Lienzo de referencia para escalar el panel de la llave (no depende del arte). */
export const W = 1376
export const H = 768

/** Nueva ilustración de la entrada (1672×940). Todo lo demás sale de estos porcentajes de la escena. */
export const ENTRANCE_IMAGE = '/images/entrance.png'

/** Hoja de la puerta (las dos tablas de madera), articulada a la izquierda. */
export const LEAF_RECT: Rect = { x: 37.2, y: 8.5, w: 24.4, h: 73.6 }

/** Perilla dorada con cerradura, en % de la hoja. */
export const HANDLE_RECT: Rect = { x: 77.9, y: 48, w: 11, h: 15 }

/** A dónde se acerca la cámara (cerradura) y el centro de la puerta, en % de la escena. */
export const KEYHOLE = { x: 57.6, y: 52 }
export const DOOR_CENTER = { x: 49.4, y: 45.3 }

export const ZOOM_SCALE = 4.6

export const MAILBOX: Rect = { x: 14.7, y: 34.3, w: 10.5, h: 13.8 }
export const DOORBELL: Rect = { x: 67.1, y: 41, w: 4.2, h: 11.7 }
