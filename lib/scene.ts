import type { CSSProperties } from 'react'

export const SCENE_IMAGE = '/images/kitchen.png'
/** Natural pixel size of SCENE_IMAGE (kitchen.png), used to convert % rects into real aspect ratio math. */
export const SCENE_ASPECT = 1679 / 937

/** Rectangle expressed in percentages of its container (0-100). */
export type Rect = { x: number; y: number; w: number; h: number }
export type Point = { x: number; y: number }
export type Placement = 'top' | 'bottom' | 'left' | 'right'

export const rectStyle = ({ x, y, w, h }: Rect): CSSProperties => ({
  left: `${x}%`,
  top: `${y}%`,
  width: `${w}%`,
  height: `${h}%`,
})

export const BATHROOM_IMAGE = '/images/bathroom.png'

export type View =
  | 'login' | 'main_kitchen' | 'main_bathroom'
  | 'zoomed_fridge' | 'zoomed_pantry' | 'zoomed_fruit' | 'zoomed_pets'
  | 'zoomed_freezer' | 'zoomed_cabinet' | 'zoomed_shelf' | 'zoomed_paper' | 'zoomed_firstaid' | 'zoomed_sink' | 'zoomed_cleaning'
export type ZoomView = Exclude<View, 'login' | 'main_kitchen' | 'main_bathroom'>

const BATH_ZOOMS: View[] = ['zoomed_cabinet', 'zoomed_shelf', 'zoomed_paper', 'zoomed_firstaid', 'zoomed_sink', 'zoomed_cleaning']
/** Pantalla principal a la que se vuelve desde un zoom. */
export const mainOf = (view: View): 'main_kitchen' | 'main_bathroom' => (view === 'main_bathroom' || BATH_ZOOMS.includes(view) ? 'main_bathroom' : 'main_kitchen')

export const MAIN_HOTSPOTS: Record<ZoomView, { rect: Rect; label: string; shape: string }> = {
  zoomed_fridge: { rect: { x: 2.2, y: 15, w: 19.4, h: 64.6 }, label: 'Abrir la refrigeradora', shape: 'rounded-lg' },
  zoomed_pantry: { rect: { x: 75.4, y: 9.3, w: 20.1, h: 70 }, label: 'Abrir la alacena', shape: 'rounded-lg' },
  zoomed_fruit: { rect: { x: 43.6, y: 50.5, w: 14.2, h: 15.5 }, label: 'Acercarse al frutero', shape: 'rounded-[40%]' },
  zoomed_pets: { rect: { x: 1, y: 74, w: 30, h: 24.5 }, label: 'Ir a la estación de Monchi y Mandy', shape: 'rounded-2xl' },
  // El congelador se abre desde el interior de la refrigeradora (no es clicable en la escena principal)
  zoomed_freezer: { rect: { x: 0, y: 0, w: 0, h: 0 }, label: 'Ver el congelador', shape: 'rounded-lg' },
  // Baño (porcentajes de bathroom.png)
  zoomed_cabinet: { rect: { x: 8.5, y: 11, w: 13.5, h: 72 }, label: 'Abrir el gabinete de toallas', shape: 'rounded-lg' },
  zoomed_shelf: { rect: { x: 22.3, y: 19.5, w: 18.4, h: 64 }, label: 'Acercarse al estante', shape: 'rounded-lg' },
  zoomed_paper: { rect: { x: 30.2, y: 11.3, w: 8.6, h: 7.9 }, label: 'Ver el papel higiénico', shape: 'rounded-lg' },
  zoomed_firstaid: { rect: { x: 24.6, y: 58.3, w: 5.9, h: 7.6 }, label: 'Abrir el botiquín', shape: 'rounded-lg' },
  zoomed_sink: { rect: { x: 41.2, y: 44, w: 16.2, h: 37 }, label: 'Abrir el gabinete del lavabo', shape: 'rounded-lg' },
  zoomed_cleaning: { rect: { x: 63.5, y: 8, w: 29, h: 82 }, label: 'Abrir el área de limpieza', shape: 'rounded-lg' },
}

/** Where the camera dives into for each zoom (percent of the scene). */
export const ZOOM_ORIGIN: Record<ZoomView, Point> = {
  zoomed_fridge: { x: 15, y: 50 },
  zoomed_pantry: { x: 88.5, y: 48 },
  zoomed_fruit: { x: 50.5, y: 57 },
  zoomed_pets: { x: 16, y: 88 },
  zoomed_freezer: { x: 26, y: 40 },
  zoomed_cabinet: { x: 15, y: 47 },
  zoomed_shelf: { x: 31.5, y: 50 },
  zoomed_paper: { x: 34.5, y: 15 },
  zoomed_firstaid: { x: 27.5, y: 62 },
  zoomed_sink: { x: 49.5, y: 62 },
  zoomed_cleaning: { x: 78, y: 45 },
}

export const SCENE_CENTER: Point = { x: 50, y: 50 }

/** Post-its de Voz e Historial, pegados sobre el mural central (corcho con calendario y recuerdos). */
export const VOICE_NOTE: Rect = { x: 38.4, y: 35.2, w: 4.2, h: 8.5 }
export const HISTORY_NOTE: Rect = { x: 56, y: 35.2, w: 4.2, h: 8.5 }

export const ZOOM_META: Record<ZoomView, { eyebrow: string; title: string }> = {
  zoomed_fridge: { eyebrow: 'Frescos', title: 'Refrigeradora' },
  zoomed_pantry: { eyebrow: 'Despensa', title: 'Alacena' },
  zoomed_fruit: { eyebrow: 'Maduración', title: 'Frutero de la isla' },
  zoomed_pets: { eyebrow: 'Mascotas', title: 'Monchi y Mandy' },
  zoomed_freezer: { eyebrow: 'Congelador', title: 'Carnes y congelados' },
  zoomed_cabinet: { eyebrow: 'Ropa blanca', title: 'Gabinete de toallas' },
  zoomed_shelf: { eyebrow: 'Aseo personal', title: 'Estante del baño' },
  zoomed_paper: { eyebrow: 'Consumibles', title: 'Papel higiénico' },
  zoomed_firstaid: { eyebrow: 'Salud', title: 'Botiquín' },
  zoomed_sink: { eyebrow: 'Lavabo', title: 'Lavabo y gabinete' },
  zoomed_cleaning: { eyebrow: 'Limpieza', title: 'Área de limpieza' },
}

export const BATH_CABINET_DOORS: [Rect, Rect] = [
  { x: 8.9, y: 12.8, w: 5.8, h: 69.5 },
  { x: 14.8, y: 12.8, w: 6.7, h: 69.5 },
]
export const SINK_DOORS: [Rect, Rect] = [
  { x: 42, y: 57.6, w: 7.3, h: 22.5 },
  { x: 49.5, y: 57.6, w: 7.4, h: 22.5 },
]
export const CLEAN_DOORS: [Rect, Rect] = [
  { x: 67.3, y: 10.6, w: 8.6, h: 21.4 },
  { x: 76.1, y: 10.6, w: 8.7, h: 21.4 },
]

/** Doors of the two tall cabinets, in percent of the main scene (medidas sobre los bordes reales de kitchen.png, 1679×937). */
export const FRIDGE_DOORS: [Rect, Rect] = [
  { x: 2.44, y: 15.47, w: 9, h: 40.45 }, // px 41→192, 145→524
  { x: 11.44, y: 15.47, w: 9.65, h: 40.45 }, // px 192→354
]
export const PANTRY_DOORS: [Rect, Rect] = [
  { x: 78.26, y: 9.82, w: 8.22, h: 66.06 }, // px 1314→1452, 92→711
  { x: 86.48, y: 9.82, w: 8.22, h: 66.06 }, // px 1452→1590
]

export const FRUIT_BOWL: Rect = MAIN_HOTSPOTS.zoomed_fruit.rect
export const LAMP_ORIGIN: Point = { x: 48.84, y: 11.1 } // boca de la pantalla de la lámpara, px (820, 104)
export const PETS_STATION: Rect = MAIN_HOTSPOTS.zoomed_pets.rect
/** Paragüero de mimbre junto a la alacena (cesta + mangos de los paraguas), px 1147→1265, 505→917 de kitchen.png. */
export const UMBRELLA_STAND: Rect = { x: 68.3, y: 53.9, w: 7.05, h: 44 }

/** Paints the part of the main scene image that sits under `rect` (used for doors that swing open). */
export const sceneSliceStyle = ({ x, y, w, h }: Rect, src: string = SCENE_IMAGE): CSSProperties => ({
  backgroundImage: `url(${src})`,
  backgroundRepeat: 'no-repeat',
  backgroundSize: `${(100 / w) * 100}% ${(100 / h) * 100}%`,
  backgroundPosition: `${(x / (100 - w)) * 100}% ${(y / (100 - h)) * 100}%`,
})
