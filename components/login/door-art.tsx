import { sceneSliceStyle } from '@/lib/scene'
import { ENTRANCE_IMAGE, LEAF_RECT } from './door-layout'

/** Fachada completa de la entrada (pared, marco, buzón "PERALTA", timbre, lámparas y felpudo). */
export function WallArt() {
  return <img src={ENTRANCE_IMAGE} alt="Entrada de la casa Peralta" className="absolute inset-0 size-full" draggable={false} />
}

/** La hoja de la puerta recortada de la misma ilustración, para poder abrirla en 3D. */
export function LeafArt() {
  return <div aria-hidden className="absolute inset-0" style={sceneSliceStyle(LEAF_RECT, ENTRANCE_IMAGE)} />
}
