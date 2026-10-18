import type { Rect } from '@/lib/scene'

/** Lienzo de referencia para escalar el panel de la llave (no depende del arte). */
export const W = 1376
export const H = 768

/** Ilustración de la entrada (1672×940) SIN las macetas: van como capa aparte para poder moverlas.
 *  Está alineada con la original (≤1 px), así que la hoja, la manija, el buzón y el timbre no cambian. */
export const ENTRANCE_IMAGE = '/images/entrance-clean.png'

/** Maceta con planta (PNG transparente, recorte ajustado, proporción ≈1,01). */
export const PLANT_IMAGE = '/images/entrance-plant.png'
/** Macetas en % de la escena, ajustadas sobre la posición y el tamaño de las de la ilustración original. */
export const PLANT_RIGHT: Rect = { x: 83.72, y: 56.05, w: 19.48, h: 34.29 } // espejada; esconde la llave de Amy
export const PLANT_LEFT: Rect = { x: -0.24, y: 57.47, w: 17.94, h: 31.59 } // easter egg
/** Llave de la administradora: en el suelo, donde se apoyaba la maceta derecha. */
export const ADMIN_KEY: Rect = { x: 89.7, y: 84, w: 9, h: 7.7 }

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
