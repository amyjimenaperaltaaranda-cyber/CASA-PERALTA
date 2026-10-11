import type { StockZone } from './inventory'
import type { Rect } from './scene'

/* Catálogo de la casa: qué muebles hay, qué insumos guarda cada uno y cómo se compra, se usa y caduca cada cual.
   Los valores (días de vida, gramos por taza, piezas por kilo) son puntos de partida razonables, no verdades. */

/** 'units' se cuenta por piezas (se pueden usar fracciones); 'measure' se pesa en gramos y se usa por tazas. */
export type Tracking = 'units' | 'measure'

export type Expiry =
  | { kind: 'date'; days: number } // vence en una fecha que se elige al comprar (botones); `days` es la sugerida
  | { kind: 'shelf'; days: number } // dura `days` desde que se abre / se empieza a usar
  | { kind: 'none' }

/** Una forma de comprar. `amount` va en la unidad base; `kg` sirve para aprender cuántas piezas trae un kilo. */
export type BuyOption = { id: string; label: string; hint?: string; amount?: number; kg?: number }
export type UseOption = { id: string; label: string; amount: number }

export type Article = {
  id: string
  shelfId: string
  name: string
  tracking: Tracking
  /** Unidad base [singular, plural]. En 'measure' siempre son gramos. */
  unit: [string, string]
  buy: BuyOption[]
  use: UseOption[]
  expiry: Expiry
  /** Cantidad típica de una compra; sirve de referencia para la barra. */
  par?: number
  /** Piezas por kilo (valor inicial) para insumos que se compran por kilo pero se cuentan por pieza. */
  perKg?: number
  /** Costales de uso diario: la cantidad baja sola entre revisiones según el ritmo. */
  passive?: boolean
  /** Ritmo previsto por día (unidad base), p. ej. las croquetas de las gatas. */
  plannedPerDay?: number
  /** Frutas: días que tarda en pasar de una etapa de madurez a la siguiente (verde → en su punto → pasada). */
  ripenDays?: number
  /** Dos fases: días de vida una vez abierto. Vence lo que ocurra primero entre la fecha impresa y abierto + estos días. */
  openLife?: number
  /** Producto creado por el usuario (no viene en el catálogo del código). */
  custom?: boolean
  typeId?: string
  createdBy?: string
  createdAt?: string
  /** Borrado suave: el producto se oculta pero sigue guardado y se puede restaurar. */
  deletedAt?: string | null
}

export type Shelf = { id: string; name: string; zone: StockZone; rect: Rect; image?: string }

export const G: [string, string] = ['g', 'g']

/* --------------------------------- botones --------------------------------- */

export const whole = (...values: number[]): UseOption[] => values.map((value) => ({ id: `u${value}`, label: `${value}`, amount: value }))
export const halves: UseOption[] = [
  { id: 'h', label: '½', amount: 0.5 },
  { id: 'o', label: '1', amount: 1 },
  { id: 'd', label: '2', amount: 2 },
]
export const parts: UseOption[] = [
  { id: 'q', label: '¼', amount: 0.25 },
  { id: 't', label: '⅓', amount: 1 / 3 },
  { id: 'h', label: '½', amount: 0.5 },
  { id: 'o', label: '1', amount: 1 },
]
const cups = (grams: number): UseOption[] =>
  (
    [
      ['¼ taza', 0.25],
      ['½ taza', 0.5],
      ['1 taza', 1],
      ['2 tazas', 2],
      ['3 tazas', 3],
    ] as const
  ).map(([label, count]) => ({ id: `c${count}`, label, amount: Math.round(grams * count) }))

const kilo = (count: number): BuyOption => ({
  id: `kg${count}`,
  label: count === 1 ? '1 kilo' : count === 0.5 ? '½ kilo' : `${count} kilos`,
  kg: count,
})
export const one = (label: string, hint?: string): BuyOption => ({ id: 'one', label, hint, amount: 1 })
export const bag = (label: string, grams: number): BuyOption => ({ id: `g${grams}`, label, amount: grams })

/* --------------------------------- muebles --------------------------------- */

export const shelves: Shelf[] = [
  { id: 'huevos', name: 'Huevos', zone: 'fridge', rect: { x: 34.5, y: 63.7, w: 20.5, h: 7.8 }, image: '/images/eggs.png' },
  { id: 'leche', name: 'Leche', zone: 'fridge', rect: { x: 15, y: 13, w: 31, h: 19 } },
  { id: 'yogur', name: 'Yogur', zone: 'fridge', rect: { x: 52, y: 23.5, w: 34, h: 9 } },
  { id: 'queso', name: 'Queso', zone: 'fridge', rect: { x: 16, y: 39, w: 37, h: 10 } },
  { id: 'mantequilla', name: 'Mantequilla', zone: 'fridge', rect: { x: 58, y: 40, w: 25, h: 9 } },
  { id: 'jugo', name: 'Jugo de naranja', zone: 'fridge', rect: { x: 23, y: 52, w: 11, h: 21 } },
  { id: 'guiso', name: 'Táper de guiso', zone: 'fridge', rect: { x: 55, y: 61, w: 26, h: 12 } },
  { id: 'verdes', name: 'Verduras verdes', zone: 'fridge', rect: { x: 11, y: 77, w: 38, h: 15 } },
  { id: 'rojas', name: 'Verduras rojas', zone: 'fridge', rect: { x: 51, y: 77, w: 38, h: 15 } },

  { id: 'harina', name: 'Harina', zone: 'pantry', rect: { x: 17, y: 12.5, w: 25, h: 12 } },
  { id: 'menestras', name: 'Menestras', zone: 'pantry', rect: { x: 42, y: 13, w: 43, h: 11.5 } },
  { id: 'atun', name: 'Atún', zone: 'pantry', rect: { x: 19, y: 32, w: 12, h: 11 } },
  { id: 'latas', name: 'Conservas', zone: 'pantry', rect: { x: 32, y: 29, w: 53, h: 14.5 } },
  { id: 'papas', name: 'Papas', zone: 'pantry', rect: { x: 17, y: 48, w: 35, h: 14 } },
  { id: 'cebollas', name: 'Cebollas', zone: 'pantry', rect: { x: 52, y: 47, w: 34, h: 15 } },
  { id: 'arroz', name: 'Arroz', zone: 'pantry', rect: { x: 20, y: 65, w: 29, h: 22 } },
  { id: 'azucar', name: 'Azúcar', zone: 'pantry', rect: { x: 54, y: 68, w: 32, h: 19 } },

  // Baño
  { id: 'toallas-arriba', name: 'Toallas (arriba)', zone: 'cabinet', rect: { x: 15, y: 16, w: 64, h: 14.5 } },
  { id: 'toallas-abajo', name: 'Toallas (abajo)', zone: 'cabinet', rect: { x: 15, y: 64, w: 64, h: 16.5 } },

  { id: 'shampoos', name: 'Shampoos y jabones', zone: 'shelf', rect: { x: 24, y: 15, w: 29, h: 13.5 } },
  { id: 'accesorios', name: 'Esponjas', zone: 'shelf', rect: { x: 53, y: 14, w: 26, h: 15 } },
  { id: 'cepillos-sh', name: 'Cepillos y esponjas de baño', zone: 'shelf', rect: { x: 56, y: 34, w: 26, h: 13 } },
  { id: 'aseo', name: 'Aseo diario', zone: 'shelf', rect: { x: 19, y: 32, w: 37, h: 14 } },
  { id: 'toallas-mano', name: 'Toallas de mano', zone: 'shelf', rect: { x: 20, y: 49, w: 26, h: 13 } },
  { id: 'cremas', name: 'Cremas y acondicionador', zone: 'shelf', rect: { x: 52, y: 48, w: 28, h: 16 } },
  { id: 'toallas-guardadas', name: 'Toallas guardadas', zone: 'shelf', rect: { x: 20, y: 80, w: 32, h: 16 } },

  { id: 'papel', name: 'Papel higiénico', zone: 'paper', rect: { x: 24, y: 33, w: 66, h: 30 } },

  { id: 'paracetamol', name: 'Paracetamol', zone: 'firstaid', rect: { x: 20.5, y: 20, w: 9.5, h: 22 } },
  { id: 'ibuprofeno', name: 'Ibuprofeno', zone: 'firstaid', rect: { x: 30.5, y: 20, w: 11, h: 9 } },
  { id: 'curitas', name: 'Curitas', zone: 'firstaid', rect: { x: 29.5, y: 30.5, w: 12.5, h: 14 } },
  { id: 'sales', name: 'Sales de rehidratación', zone: 'firstaid', rect: { x: 42, y: 20, w: 10.5, h: 9.5 } },
  { id: 'gasa-rollo', name: 'Gasa en rollo', zone: 'firstaid', rect: { x: 54.5, y: 22, w: 7, h: 21 } },
  { id: 'jarabes', name: 'Jarabes', zone: 'firstaid', rect: { x: 16, y: 50, w: 12.5, h: 16 } },
  { id: 'cremas-b', name: 'Cremas y antiséptico', zone: 'firstaid', rect: { x: 32.5, y: 46.5, w: 11.5, h: 15 } },
  { id: 'alcohol', name: 'Alcohol 70°', zone: 'firstaid', rect: { x: 43.3, y: 47, w: 6.7, h: 17 } },
  { id: 'vendas', name: 'Vendas', zone: 'firstaid', rect: { x: 50, y: 50, w: 16.5, h: 18 } },

  { id: 'cepillos-pasta', name: 'Cepillos y pasta dental', zone: 'sink', rect: { x: 20, y: 36, w: 15, h: 12.5 } },
  { id: 'jabon-manos', name: 'Jabón de manos', zone: 'sink', rect: { x: 54, y: 38, w: 8.5, h: 10 } },
  { id: 'esponjas', name: 'Esponjas', zone: 'sink', rect: { x: 27, y: 61.5, w: 24, h: 10.5 } },
  { id: 'lavavajillas', name: 'Lavavajillas', zone: 'sink', rect: { x: 54, y: 56, w: 10, h: 16 } },

  { id: 'cepillos-limp', name: 'Cepillos de limpieza', zone: 'cleaning', rect: { x: 28, y: 9, w: 18, h: 10 } },
  { id: 'guantes', name: 'Guantes', zone: 'cleaning', rect: { x: 49, y: 11.5, w: 23, h: 8 } },
  { id: 'sprays', name: 'Sprays limpiadores', zone: 'cleaning', rect: { x: 27, y: 19.5, w: 23, h: 7 } },
  { id: 'panos', name: 'Paños', zone: 'cleaning', rect: { x: 50, y: 22, w: 22, h: 9 } },
  { id: 'liquidos', name: 'Detergentes líquidos', zone: 'cleaning', rect: { x: 35, y: 35.5, w: 24, h: 12 } },
  { id: 'polvo', name: 'Detergente en polvo', zone: 'cleaning', rect: { x: 54, y: 54, w: 25, h: 26 } },
  { id: 'trapeadores', name: 'Trapeadores y escobas', zone: 'cleaning', rect: { x: 85, y: 16, w: 15, h: 59 } },

  // Congelador (imagen freezer.png)
  { id: 'res', name: 'Res', zone: 'freezer', rect: { x: 6.5, y: 26.5, w: 17.5, h: 21 } },
  { id: 'pollo', name: 'Pollo', zone: 'freezer', rect: { x: 22.3, y: 29.8, w: 12.5, h: 17 } },
  { id: 'molida', name: 'Carne molida', zone: 'freezer', rect: { x: 34.4, y: 30.2, w: 11.7, h: 16.2 } },
  { id: 'cerdo', name: 'Cerdo', zone: 'freezer', rect: { x: 7, y: 48, w: 19.5, h: 18.5 } },
  { id: 'helados', name: 'Helados', zone: 'freezer', rect: { x: 25.5, y: 48.5, w: 21, h: 17.5 } },
  { id: 'arvejas', name: 'Arvejas congeladas', zone: 'freezer', rect: { x: 53.3, y: 28, w: 34, h: 38.2 } },
  { id: 'tapers-arvejas', name: 'Arvejas en táper', zone: 'freezer', rect: { x: 75.8, y: 41, w: 15, h: 24.5 } },

  // "Otros": un lugar por zona para productos nuevos que no encajan en un mueble dibujado
  // Esquina superior derecha: la izquierda ya la ocupan el botón "Volver" y la etiqueta de la zona.
  { id: 'otros-fridge', name: 'Puerta y otros', zone: 'fridge', rect: { x: 82, y: 2, w: 16, h: 5 } },
  { id: 'otros-freezer', name: 'Otros congelados', zone: 'freezer', rect: { x: 82, y: 2, w: 16, h: 7 } },
  { id: 'otros-pantry', name: 'Otros de alacena', zone: 'pantry', rect: { x: 82, y: 2, w: 16, h: 7 } },
  { id: 'otros-cabinet', name: 'Otros del gabinete', zone: 'cabinet', rect: { x: 78, y: 2, w: 20, h: 4 } },
  { id: 'otros-shelf', name: 'Otros del estante', zone: 'shelf', rect: { x: 78, y: 2, w: 20, h: 4 } },
  { id: 'otros-firstaid', name: 'Otros del botiquín', zone: 'firstaid', rect: { x: 82, y: 2, w: 16, h: 7 } },
  { id: 'otros-sink', name: 'Otros del lavabo', zone: 'sink', rect: { x: 78, y: 2, w: 20, h: 6 } },
  { id: 'otros-cleaning', name: 'Otros de limpieza', zone: 'cleaning', rect: { x: 78, y: 2, w: 20, h: 6 } },

  // Frutero de la isla (el panel se ancla junto a la nota de la vista)
  { id: 'frutero', name: 'Frutero', zone: 'fruit', rect: { x: 70, y: 12, w: 27, h: 62 } },
]

/* --------------------------------- insumos --------------------------------- */

const piece = (id: string, shelfId: string, name: string, unit: [string, string], extra: Partial<Article> = {}): Article => ({
  id,
  shelfId,
  name,
  tracking: 'units',
  unit,
  buy: [one(unit[0][0].toUpperCase() + unit[0].slice(1))],
  use: halves,
  expiry: { kind: 'date', days: 7 },
  ...extra,
})

const grain = (id: string, shelfId: string, name: string, cupGrams: number, buy: BuyOption[], extra: Partial<Article> = {}): Article => ({
  id,
  shelfId,
  name,
  tracking: 'measure',
  unit: G,
  buy,
  use: cups(cupGrams),
  expiry: { kind: 'none' },
  ...extra,
})

export const articles: Article[] = [
  // Refrigeradora
  piece('huevos', 'huevos', 'Huevos', ['huevo', 'huevos'], {
    buy: [{ id: 'plancha', label: 'Plancha', hint: '30 huevos', amount: 30 }, { id: 'media', label: 'Media plancha', hint: '15', amount: 15 }],
    use: whole(1, 2, 3, 6),
    expiry: { kind: 'date', days: 21 },
    par: 30,
  }),
  piece('leche', 'leche', 'Leche', ['caja', 'cajas'], { buy: [one('Caja 1 L')], use: parts, expiry: { kind: 'date', days: 30 }, par: 3 }),
  piece('yogur', 'yogur', 'Yogur', ['vaso', 'vasos'], {
    buy: [one('Vaso'), { id: 'pack6', label: 'Pack de 6', amount: 6 }],
    use: whole(1, 2, 3),
    expiry: { kind: 'date', days: 14 },
    par: 6,
  }),
  piece('queso', 'queso', 'Queso', ['pieza', 'piezas'], {
    buy: [one('Pieza')],
    use: [{ id: 'reb', label: 'Rebanada', amount: 0.1 }, { id: 'q', label: '¼', amount: 0.25 }, { id: 'h', label: '½', amount: 0.5 }, { id: 'o', label: '1', amount: 1 }],
    expiry: { kind: 'shelf', days: 7 },
  }),
  piece('mantequilla', 'mantequilla', 'Mantequilla', ['barra', 'barras'], { buy: [one('Barra')], use: parts, expiry: { kind: 'shelf', days: 30 } }),
  piece('jugo', 'jugo', 'Jugo de naranja', ['botella', 'botellas'], { buy: [one('Botella 1 L')], use: parts, expiry: { kind: 'shelf', days: 5 } }),
  piece('guiso', 'guiso', 'Táper de guiso', ['táper', 'tápers'], { buy: [one('Táper')], use: halves, expiry: { kind: 'date', days: 3 } }),

  piece('lechuga', 'verdes', 'Lechuga', ['pieza', 'piezas'], { par: 2 }),
  piece('brocoli', 'verdes', 'Brócoli', ['pieza', 'piezas'], { par: 2 }),
  piece('repollo', 'verdes', 'Repollo', ['pieza', 'piezas'], { expiry: { kind: 'date', days: 14 } }),
  piece('coliflor', 'verdes', 'Coliflor', ['pieza', 'piezas']),
  // El id se queda como 'soya-china' para no perder los lotes ya guardados; el nombre correcto es cebolla china.
  piece('soya-china', 'verdes', 'Cebolla china', ['atado', 'atados'], { buy: [one('Atado')], expiry: { kind: 'date', days: 5 }, par: 2 }),
  piece('poro', 'verdes', 'Poro', ['atado', 'atados'], { buy: [one('Atado')], par: 2 }),
  piece('espinaca', 'verdes', 'Espinaca', ['atado', 'atados'], { expiry: { kind: 'date', days: 7 } }),

  piece('tomate', 'rojas', 'Tomate', ['tomate', 'tomates'], { buy: [kilo(1), kilo(0.5), kilo(2)], use: whole(1, 2, 3, 4), perKg: 8, par: 8 }),
  piece('pimiento', 'rojas', 'Pimiento', ['pieza', 'piezas'], { use: whole(1, 2), expiry: { kind: 'date', days: 10 }, par: 3 }),
  piece('pepino', 'rojas', 'Pepino', ['pieza', 'piezas'], { use: whole(1, 2), par: 3 }),
  piece('zanahoria', 'rojas', 'Zanahoria', ['zanahoria', 'zanahorias'], { buy: [kilo(1), kilo(0.5)], use: whole(1, 2, 3, 4), expiry: { kind: 'date', days: 14 }, perKg: 8, par: 8 }),

  // Alacena
  grain('harina', 'harina', 'Harina', 125, [bag('Bolsa 1 kg', 1000), bag('Bolsa ½ kg', 500)], { par: 1000 }),
  grain('frejol', 'menestras', 'Frejol', 180, [bag('Bolsa ½ kg', 500), bag('Bolsa 1 kg', 1000)], { par: 500 }),
  grain('lenteja', 'menestras', 'Lenteja', 190, [bag('Bolsa ½ kg', 500), bag('Bolsa 1 kg', 1000)], { par: 500 }),
  grain('garbanzo', 'menestras', 'Garbanzo', 180, [bag('Bolsa ½ kg', 500), bag('Bolsa 1 kg', 1000)], { par: 500 }),
  grain('arveja', 'menestras', 'Arveja', 180, [bag('Bolsa ½ kg', 500), bag('Bolsa 1 kg', 1000)], { par: 500 }),

  piece('atun', 'atun', 'Atún', ['lata', 'latas'], { buy: [one('Lata'), { id: 'pack3', label: 'Pack de 3', amount: 3 }], use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 3 }),
  piece('tomate-lata', 'latas', 'Tomate en lata', ['lata', 'latas'], { use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 3 }),
  piece('arvejas-lata', 'latas', 'Arvejas en lata', ['lata', 'latas'], { use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 3 }),
  piece('choclo-lata', 'latas', 'Choclo en lata', ['lata', 'latas'], { use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 3 }),
  piece('sopa', 'latas', 'Sopa', ['sobre', 'sobres'], { use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 3 }),
  piece('leche-evaporada', 'latas', 'Leche evaporada', ['lata', 'latas'], { use: parts, expiry: { kind: 'date', days: 365 }, par: 3 }),

  piece('papa-amarilla', 'papas', 'Papa amarilla', ['papa', 'papas'], { buy: [kilo(1), kilo(0.5), kilo(2)], use: whole(1, 2, 3, 5), expiry: { kind: 'date', days: 30 }, perKg: 8, par: 8 }),
  piece('papa-blanca', 'papas', 'Papa blanca', ['papa', 'papas'], { buy: [kilo(1), kilo(0.5), kilo(2)], use: whole(1, 2, 3, 5), expiry: { kind: 'date', days: 30 }, perKg: 8, par: 8 }),
  piece('papa-huayro', 'papas', 'Papa huayro', ['papa', 'papas'], { buy: [kilo(1), kilo(0.5), kilo(2)], use: whole(1, 2, 3, 5), expiry: { kind: 'date', days: 30 }, perKg: 8, par: 8 }),

  piece('cebolla-roja', 'cebollas', 'Cebolla roja', ['cebolla', 'cebollas'], { buy: [kilo(1), kilo(0.5), kilo(2)], use: whole(1, 2, 3), expiry: { kind: 'date', days: 30 }, perKg: 6, par: 6 }),
  piece('cebolla-blanca', 'cebollas', 'Cebolla blanca', ['cebolla', 'cebollas'], { buy: [kilo(1), kilo(0.5), kilo(2)], use: whole(1, 2, 3), expiry: { kind: 'date', days: 30 }, perKg: 6, par: 6 }),

  grain('arroz', 'arroz', 'Arroz', 190, [bag('Costal 25 kg', 25000), bag('Bolsa 5 kg', 5000)], { passive: true, par: 25000 }),
  grain('azucar', 'azucar', 'Azúcar', 200, [bag('Costal 10 kg', 10000), bag('Bolsa 1 kg', 1000)], { passive: true, par: 10000 }),

  // Estación de mascotas (9 kg a 143 g/día ≈ 9 semanas)
  grain('croquetas', 'croquetas', 'Croquetas Michicat', 0, [bag('Costal 9 kg', 9000)], { passive: true, par: 9000, plannedPerDay: 143 }),
]

/** Líquidos que se miden en mililitros. `daily` = uso diario: la cantidad baja sola entre revisiones (como el arroz). */
const ml = (...values: number[]): UseOption[] => values.map((value) => ({ id: `m${value}`, label: `${value} ml`, amount: value }))
const liquid = (id: string, shelfId: string, name: string, buy: BuyOption[], par: number, extra: Partial<Article> = {}): Article => ({
  id, shelfId, name, tracking: 'measure', unit: ['ml', 'ml'], buy, use: ml(10, 25, 50), expiry: { kind: 'none' }, passive: true, par, ...extra,
})
const bottle = (label: string, amount: number) => bag(label, amount)
const NOEXP: Expiry = { kind: 'none' }

const gUse = (...values: number[]): UseOption[] => values.map((value) => ({ id: `g${value}`, label: value >= 1000 ? `${value / 1000} kg` : `${value} g`, amount: value }))

/** Condimentos de cocina: casi no se vencen, solo importa cuánto queda del frasco. */
const condimentLiquid = (id: string, name: string, par: number, extra: Partial<Article> = {}): Article => ({
  id, shelfId: 'otros-pantry', name, tracking: 'measure', unit: ['ml', 'ml'],
  buy: [bag('Botella 500 ml', 500), bag('Botella 1 L', 1000)],
  use: ml(5, 10, 20, 50), expiry: { kind: 'date', days: 730 }, par, typeId: 'condimento-liquido', ...extra,
})
const condimentDry = (id: string, name: string, par: number, extra: Partial<Article> = {}): Article => ({
  id, shelfId: 'otros-pantry', name, tracking: 'measure', unit: G,
  buy: [bag('Frasco 100 g', 100), bag('Frasco 250 g', 250)],
  use: gUse(5, 10, 25, 50), expiry: { kind: 'date', days: 730 }, par, typeId: 'condimento-seco', ...extra,
})
/** Jabón de barra, detergente en pasta, margarina: se gastan solos como un líquido de uso, pero en gramos. */
const solid = (id: string, shelfId: string, name: string, par: number, extra: Partial<Article> = {}): Article => ({
  id, shelfId, name, tracking: 'measure', unit: G,
  buy: [bag('Pieza 90 g', 90), bag('Pieza 150 g', 150), bag('Paquete 1 kg', 1000)],
  use: gUse(10, 25, 50, 100), expiry: { kind: 'none' }, passive: true, par, typeId: 'solido', ...extra,
})


articles.push(
  // Gabinete de toallas
  piece('toallas-blancas', 'toallas-arriba', 'Toallas blancas', ['toalla', 'toallas'], { buy: [one('Toalla'), { id: 'set4', label: 'Juego de 4', amount: 4 }], use: whole(1, 2), expiry: NOEXP, par: 4 }),
  piece('toallas-color', 'toallas-arriba', 'Toallas de colores', ['toalla', 'toallas'], { buy: [one('Toalla'), { id: 'set4', label: 'Juego de 4', amount: 4 }], use: whole(1, 2), expiry: NOEXP, par: 5 }),
  piece('toallas-bano-blancas', 'toallas-abajo', 'Toallas de baño blancas', ['toalla', 'toallas'], { use: whole(1, 2), expiry: NOEXP, par: 4 }),
  piece('toallas-bano-color', 'toallas-abajo', 'Toallas de baño de colores', ['toalla', 'toallas'], { use: whole(1, 2), expiry: NOEXP, par: 4 }),

  // Estante
  liquid('elvive-oleo', 'shampoos', 'Shampoo Sábila anticaspa', [bottle('Frasco 510 ml', 510)], 510),
  liquid('elvive-liso', 'shampoos', 'Head & Shoulders anticomezón', [bottle('Frasco 180 ml', 180)], 180),
  liquid('palmolive-ducha', 'shampoos', 'Head & Shoulders con cafeína', [bottle('Frasco 650 ml', 650)], 650),
  liquid('dove', 'shampoos', 'Body exfoliante Goji Berry', [bottle('Frasco 500 ml', 500)], 500),
  piece('esponjas-bano', 'accesorios', 'Esponjas de baño', ['esponja', 'esponjas'], { use: whole(1, 2), expiry: { kind: 'shelf', days: 60 }, par: 3 }),
  piece('cepillos-espalda', 'cepillos-sh', 'Cepillos de espalda', ['cepillo', 'cepillos'], { use: whole(1), expiry: NOEXP, par: 2 }),
  liquid('listerine', 'aseo', 'Quitamanchas Tax (sin lejía)', [bottle('Frasco 650 ml', 650)], 650, { passive: false, use: ml(20, 40) }),
  liquid('johnsons', 'aseo', 'Perfumador ambiental lavanda', [bottle('Galón 5 L', 5000)], 5000),
  liquid('nivea-crema', 'aseo', 'Crema Nivea', [bottle('Frasco 250 ml', 250), bottle('Frasco 400 ml', 400)], 250),
  liquid('palmolive-aloe', 'aseo', 'Lejía Clorina lavanda', [bottle('Galón 5 kg', 5000)], 5000),
  piece('toallas-mano', 'toallas-mano', 'Toallas de mano', ['toalla', 'toallas'], { use: whole(1, 2), expiry: NOEXP, par: 4 }),
  liquid('elseve-acond', 'cremas', 'Acondicionador Amaraz sin sal fortalecedor', [bottle('Frasco 260 ml', 260)], 260),
  piece('cremas-cuidado', 'cremas', 'Cremas de cuidado', ['tubo', 'tubos'], { use: parts, expiry: { kind: 'date', days: 365 }, par: 3 }),
  piece('toallas-guardadas', 'toallas-guardadas', 'Toallas de repuesto', ['toalla', 'toallas'], { use: whole(1, 2), expiry: NOEXP, par: 3 }),

  // Papel higiénico
  piece('papel', 'papel', 'Papel higiénico', ['rollo', 'rollos'], { buy: [{ id: 'p6', label: 'Paquete de 6', amount: 6 }, { id: 'p12', label: 'Paquete de 12', amount: 12 }, { id: 'p24', label: 'Paquete de 24', amount: 24 }], use: whole(1, 2, 3), expiry: NOEXP, par: 12 }),

  // Botiquín (la fecha de vencimiento se elige al comprar)
  piece('paracetamol', 'paracetamol', 'Paracetamol 500 mg', ['tableta', 'tabletas'], { buy: [{ id: 'c10', label: 'Caja de 10', amount: 10 }, { id: 'c100', label: 'Caja de 100', amount: 100 }], use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 20 }),
  piece('ibuprofeno', 'ibuprofeno', 'Ibuprofeno 400 mg', ['tableta', 'tabletas'], { buy: [{ id: 'c10', label: 'Caja de 10', amount: 10 }, { id: 'c100', label: 'Caja de 100', amount: 100 }], use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 20 }),
  piece('curitas', 'curitas', 'Curitas', ['curita', 'curitas'], { buy: [{ id: 'c20', label: 'Caja de 20', amount: 20 }, { id: 'c100', label: 'Caja de 100', amount: 100 }], use: whole(1, 2, 3, 5), expiry: NOEXP, par: 20 }),
  piece('sales', 'sales', 'Sales de rehidratación', ['sobre', 'sobres'], { buy: [{ id: 'p4', label: 'Caja de 4', amount: 4 }], use: whole(1, 2), expiry: { kind: 'date', days: 365 }, par: 4 }),
  piece('gasa-rollo', 'gasa-rollo', 'Gasa en rollo', ['rollo', 'rollos'], { use: whole(1), expiry: NOEXP, par: 2 }),
  liquid('jarabe-tos', 'jarabes', 'Jarabe para la tos', [bottle('Frasco 120 ml', 120)], 120, { passive: false, use: ml(5, 10, 15), expiry: { kind: 'date', days: 365 } }),
  liquid('jarabe-infantil', 'jarabes', 'Jarabe infantil', [bottle('Frasco 120 ml', 120)], 120, { passive: false, use: ml(2.5, 5, 7.5), expiry: { kind: 'date', days: 365 } }),
  piece('crema-heridas', 'cremas-b', 'Crema para heridas', ['tubo', 'tubos'], { use: parts, expiry: { kind: 'date', days: 365 }, par: 1 }),
  piece('antiseptico', 'cremas-b', 'Antiséptico', ['tubo', 'tubos'], { use: parts, expiry: { kind: 'date', days: 365 }, par: 1 }),
  liquid('alcohol', 'alcohol', 'Alcohol isopropílico Lozano', [bottle('Frasco 900 ml', 900)], 900, { passive: false, use: ml(10, 25, 50) }),
  piece('vendas', 'vendas', 'Vendas', ['venda', 'vendas'], { use: whole(1), expiry: NOEXP, par: 3 }),

  // Lavabo
  piece('cepillos-dientes', 'cepillos-pasta', 'Cepillos de dientes', ['cepillo', 'cepillos'], { buy: [one('Cepillo'), { id: 'p4', label: 'Pack de 4', amount: 4 }], use: whole(1), expiry: { kind: 'shelf', days: 90 }, par: 4 }),
  piece('pasta-dental', 'cepillos-pasta', 'Pasta dental', ['tubo', 'tubos'], { use: parts, expiry: NOEXP, par: 2 }),
  liquid('jabon-manos', 'jabon-manos', 'Jabón líquido', [bottle('Frasco 500 ml', 500)], 500),
  piece('esponjas', 'esponjas', 'Esponjas', ['esponja', 'esponjas'], { buy: [one('Esponja'), { id: 'p4', label: 'Pack de 4', amount: 4 }], use: whole(1, 2), expiry: { kind: 'shelf', days: 30 }, par: 4 }),
  solid('patito', 'lavavajillas', 'Detergente lavaplatos en pasta Patito', 1000, { buy: [bag('Tazón 1 kg', 1000)] }),

  // Área de limpieza
  piece('cepillos-limp', 'cepillos-limp', 'Cepillos de limpieza', ['cepillo', 'cepillos'], { use: whole(1), expiry: NOEXP, par: 4 }),
  piece('guantes', 'guantes', 'Guantes de limpieza', ['par', 'pares'], { buy: [one('Par')], use: whole(1), expiry: NOEXP, par: 2 }),
  piece('sprays', 'sprays', 'Sprays limpiadores', ['frasco', 'frascos'], { buy: [one('Frasco')], use: parts, expiry: NOEXP, par: 3 }),
  piece('panos', 'panos', 'Paños de limpieza', ['paño', 'paños'], { buy: [one('Paño'), { id: 'p6', label: 'Pack de 6', amount: 6 }], use: whole(1, 2), expiry: NOEXP, par: 6 }),
  liquid('det-azul', 'liquidos', 'Detergente líquido (azul)', [bottle('Botella 1,5 L', 1500), bottle('Botella 3 L', 3000)], 3000),
  liquid('det-rosa', 'liquidos', 'Detergente líquido (rosa)', [bottle('Botella 1,5 L', 1500), bottle('Botella 3 L', 3000)], 3000),
  liquid('det-blanco', 'liquidos', 'Suavizante Bolívar lavanda', [bottle('Botella 360 ml', 360)], 360),
  grain('det-polvo', 'polvo', 'Detergente en polvo', 80, [bag('Bolsa 2 kg', 2000), bag('Bolsa 4 kg', 4000)], { passive: true, par: 4000 }),
  piece('trapeadores', 'trapeadores', 'Trapeadores y escobas', ['pieza', 'piezas'], { use: whole(1), expiry: NOEXP, par: 4 }),

  // Productos reales que no tenían un slot: jabones de barra, acondicionadores extra, escobillas, bata
  solid('jabon-ropa-bolivar', 'liquidos', 'Jabón de ropa Bolívar', 250, { buy: [bag('Barra 250 g', 250)] }),
  solid('jabon-moncler', 'jabon-manos', 'Jabón de baño Moncler (familiar)', 150, { buy: [bag('Barra 150 g', 150)] }),
  piece('pasta-dental-dento', 'cepillos-pasta', 'Pasta dental Dento herbal', ['tubo', 'tubos'], { use: parts, expiry: NOEXP, par: 1 }),
  liquid('fresh-can', 'shampoos', 'Fresh Can (shampoo antipulgas gatas)', [bottle('Frasco 300 ml', 300)], 300),
  liquid('amaraz-reparacion', 'cremas', 'Acondicionador Amaraz Reparación Divina', [bottle('Frasco 475 ml', 475)], 475),
  liquid('amaraz-andina', 'cremas', 'Acondicionador Amaraz Magia Andina sin sal', [bottle('Frasco 260 ml', 260)], 260),
  liquid('nutribella', 'shampoos', 'Shampoo Nutribella 15 bioqueratina', [bottle('Frasco 400 ml', 400)], 400),
  liquid('medicasp', 'shampoos', 'Shampoo Medicasp', [bottle('Frasco 130 ml', 130)], 130),
  piece('escobilla-bano', 'accesorios', 'Escobilla de baño', ['pieza', 'piezas'], { use: whole(1), expiry: NOEXP, par: 1 }),
  piece('escobillas-ropa', 'cepillos-limp', 'Escobillas para lavar ropa', ['pieza', 'piezas'], { use: whole(1), expiry: NOEXP, par: 2 }),
  piece('bata-azul', 'toallas-abajo', 'Bata azul', ['bata', 'batas'], { use: whole(1), expiry: NOEXP, par: 1 }),
)

/** Carnes y congelados: se pesan en gramos, duran meses y se sacan por porciones. */
const meat = (id: string, shelfId: string, name: string, extra: Partial<Article> = {}): Article => ({
  id,
  shelfId,
  name,
  tracking: 'measure',
  unit: G,
  buy: [bag('Bandeja ½ kg', 500), bag('Bolsa 1 kg', 1000), bag('Bolsa 2 kg', 2000)],
  use: [250, 500, 750, 1000].map((grams) => ({ id: `g${grams}`, label: grams === 1000 ? '1 kg' : `${grams} g`, amount: grams })),
  expiry: { kind: 'date', days: 90 },
  par: 1000,
  ...extra,
})

const fruit = (id: string, name: string, unit: [string, string], ripenDays: number, extra: Partial<Article> = {}): Article =>
  piece(id, 'frutero', name, unit, { buy: [kilo(1), kilo(0.5), kilo(2), one('Unidad')], use: whole(1, 2, 3), expiry: { kind: 'none' }, ripenDays, perKg: 6, par: 6, ...extra })

articles.push(
  // Congelador: presas reales (no pechuga entera) — se cuentan por pieza, no por gramos
  piece('presas-pollo', 'otros-freezer', 'Presas de pollo', ['presa', 'presas'], {
    buy: [{ id: 'bolsa5', label: 'Bolsa de 5 presas', amount: 5 }],
    use: whole(1, 2, 5),
    expiry: { kind: 'date', days: 120 },
    par: 25,
  }),
  piece('menudencia', 'otros-freezer', 'Menudencia de pollo', ['bolsa', 'bolsas'], { use: whole(1), expiry: { kind: 'date', days: 120 }, par: 3 }),
  piece('carnes-varias', 'otros-freezer', 'Carnes sin identificar', ['bolsa', 'bolsas'], { use: whole(1), expiry: { kind: 'date', days: 120 }, par: 4 }),
  piece('habas-cong', 'otros-freezer', 'Habas congeladas', ['bolsa', 'bolsas'], { use: whole(1), expiry: { kind: 'date', days: 180 }, par: 1 }),

  // Congelador
  meat('bistec-res', 'res', 'Bistec de res'),
  meat('pechuga', 'pollo', 'Pechuga de pollo'),
  meat('carne-molida', 'molida', 'Carne molida', { buy: [bag('Bandeja ½ kg', 500), bag('Bolsa 1 kg', 1000)] }),
  meat('cerdo', 'cerdo', 'Cerdo'),
  piece('helados', 'helados', 'Helados (paletas)', ['paleta', 'paletas'], { buy: [one('Paleta'), { id: 'p6', label: 'Bolsa de 6', amount: 6 }], use: whole(1, 2, 3), expiry: { kind: 'date', days: 60 }, par: 6 }),
  piece('arvejas-cong', 'arvejas', 'Arvejas congeladas', ['bolsa', 'bolsas'], { buy: [one('Bolsa')], use: parts, expiry: { kind: 'date', days: 180 }, par: 3 }),
  piece('taper-arvejas', 'tapers-arvejas', 'Arvejas en táper', ['táper', 'tápers'], { buy: [one('Táper')], use: halves, expiry: { kind: 'date', days: 60 }, par: 2 }),

  // Frutero
  fruit('platanos', 'Plátanos', ['plátano', 'plátanos'], 3, { perKg: 6, par: 6 }),
  fruit('paltas', 'Paltas', ['palta', 'paltas'], 2.5, { use: halves, perKg: 3, par: 4 }),
  fruit('naranjas', 'Naranjas', ['naranja', 'naranjas'], 7, { perKg: 5, par: 6 }),
  fruit('peras', 'Peras', ['pera', 'peras'], 3, { perKg: 5, par: 4 }),
  fruit('manzanas', 'Manzanas', ['manzana', 'manzanas'], 9, { perKg: 5, par: 6 }),
  fruit('mandarinas', 'Mandarinas', ['mandarina', 'mandarinas'], 7, { perKg: 8, par: 6 }),
)

/* --------------------- condimentos y sólidos de uso (cocina real) --------------------- */

articles.push(
  // Condimentos líquidos
  condimentLiquid('sillao', 'Sillao', 500),
  condimentLiquid('vinagre-blanco', 'Vinagre blanco', 1000),
  condimentLiquid('vinagre-tinto', 'Vinagre tinto', 1000),
  condimentLiquid('algarrobina', 'Algarrobina', 500),
  condimentLiquid('tuco', 'Tuco', 250),
  condimentLiquid('esencia-vainilla', 'Esencia de vainilla', 100),
  condimentLiquid('aji-molido', 'Ají amarillo molido', 250, { shelfId: 'otros-fridge' }),

  // Condimentos secos
  condimentDry('comino', 'Comino', 230),
  condimentDry('pimienta', 'Pimienta', 212),
  condimentDry('oregano', 'Orégano seco molido', 500, { buy: [bag('Frasco 500 ml', 500)] }),
  condimentDry('ajinomoto', 'Ajinomoto', 100),
  condimentDry('sal-marina', 'Sal marina', 1000, { buy: [bag('Paquete 1 kg', 1000)] }),

  // Sólidos de uso (cocina)
  solid('manti', 'otros-pantry', 'Manti (margarina)', 90),

  // Lácteos y enlatados reales que faltaban
  piece('cafe-kirma', 'otros-pantry', 'Café Kirma clásico', ['bolsa', 'bolsas'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('cafe-eco', 'otros-pantry', 'Café (alacena)', ['bolsa', 'bolsas'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('gelatina-roja', 'otros-pantry', 'Gelatina roja', ['sobre', 'sobres'], { use: parts, expiry: { kind: 'date', days: 365 }, par: 1 }),
  piece('gelatina-pina', 'otros-pantry', 'Gelatina Catita piña', ['sobre', 'sobres'], { use: whole(1), expiry: { kind: 'date', days: 365 }, par: 1 }),
  piece('gelatina-vainilla', 'otros-pantry', 'Gelatina Catita vainilla', ['sobre', 'sobres'], { use: whole(1), expiry: { kind: 'date', days: 365 }, par: 1 }),
  piece('frijoles-blancos', 'otros-pantry', 'Frijoles blancos', ['bolsa', 'bolsas'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('frijoles-otros', 'otros-pantry', 'Frijoles (marca por confirmar)', ['bolsa', 'bolsas'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('harina-sin-marca', 'otros-pantry', 'Harina (marca por confirmar)', ['bolsa', 'bolsas'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  grain('polvo-royal', 'otros-pantry', 'Polvo de hornear Royal', 20, [bag('Sobre 20 g', 20)], { par: 20 }),
  grain('polvo-universal', 'otros-pantry', 'Polvo de hornear Universal', 25, [bag('Sachet 25 g', 25)], { par: 25 }),
  grain('colapez', 'otros-pantry', 'Colapez Catita', 20, [bag('Sobre 20 g', 20)], { par: 20 }),
  grain('coco-rallado', 'otros-fridge', 'Coco rallado', 50, [bag('Bolsa 100 g', 100)], { par: 100 }),
  piece('chocolate-payita', 'otros-pantry', 'Chocolate La Payita', ['barra', 'barras'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('chocolate-cusco', 'otros-pantry', 'Chocolate para diluir (marca por confirmar)', ['barra', 'barras'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('chocolate-macaco', 'otros-pantry', 'Chocolate Macaco sin azúcar', ['barra', 'barras'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  grain('maicena', 'otros-pantry', 'Maicena Duryea', 20, [bag('Caja 100 g', 100), bag('Caja 110 g', 110)], { par: 110 }),
  grain('hierba-manzanilla', 'otros-pantry', 'Hierba manzanilla Herbi', 10, [bag('Caja 100 g', 100)], { par: 100 }),
  grain('hierba-luisa', 'otros-pantry', 'Hierba luisa Herbi', 10, [bag('Caja 100 g', 100)], { par: 100 }),
  piece('galletas-soda', 'otros-pantry', 'Galletas San Jorge soda', ['paquete', 'paquetes'], { use: parts, expiry: { kind: 'date', days: 180 }, par: 1 }),
  piece('galletas-vainilla', 'otros-pantry', 'Galletas de vainilla Fiel', ['paquete', 'paquetes'], { use: parts, expiry: { kind: 'date', days: 180 }, par: 1 }),
  grain('harina-preparada', 'otros-pantry', 'Harina preparada Grano de Oro', 125, [bag('Paquete 1 kg', 1000)], { par: 1000 }),
  grain('chuno', 'otros-pantry', 'Chuño', 60, [bag('Bolsa ¼ kg', 250)], { par: 250 }),
  piece('fideos-codito', 'otros-pantry', 'Fideos codito Don Máximo', ['sobre', 'sobres'], { use: whole(1), expiry: { kind: 'date', days: 365 }, par: 1 }),
  grain('quinoa', 'otros-pantry', 'Quinoa (Las Mieles)', 180, [bag('Bolsa 500 g', 500)], { par: 500 }),
  piece('oyuco', 'papas', 'Oyuco', ['kg', 'kg'], { buy: [kilo(1)], use: parts, expiry: { kind: 'date', days: 20 }, par: 1 }),
  piece('cebolla-instantanea', 'otros-pantry', 'Cebolla instantánea Eco', ['frasco', 'frascos'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  piece('pasas', 'otros-pantry', 'Pasas', ['sobre', 'sobres'], { use: parts, expiry: { kind: 'none' }, par: 1 }),
  grain('canela-molida', 'otros-pantry', 'Canela molida Dollar City', 10, [bag('Frasco 50 g', 50)], { par: 50 }),

  // Verduras y frescos reales que faltaban en el refrigerador
  piece('ajo', 'otros-fridge', 'Ajo', ['frasco', 'frascos'], { use: parts, expiry: { kind: 'date', days: 20 }, par: 1 }),
  piece('kefir', 'otros-fridge', 'Kéfir', ['frasco', 'frascos'], { use: parts, expiry: { kind: 'shelf', days: 10 }, par: 1 }),
  piece('limones', 'otros-fridge', 'Limones', ['kg', 'kg'], { buy: [kilo(1)], use: parts, expiry: { kind: 'date', days: 14 }, par: 1 }),
  piece('pimenton', 'otros-fridge', 'Pimentón rojo', ['pieza', 'piezas'], { expiry: { kind: 'date', days: 10 } }),
  piece('zapallo', 'otros-fridge', 'Zapallo (trozo)', ['trozo', 'trozos'], { use: parts, expiry: { kind: 'date', days: 10 } }),
  piece('culantro', 'otros-fridge', 'Culantro', ['atado', 'atados'], { expiry: { kind: 'date', days: 7 }, par: 2 }),
  piece('huacatay', 'otros-fridge', 'Huacatay', ['atado', 'atados'], { expiry: { kind: 'date', days: 7 } }),
  piece('kion', 'otros-fridge', 'Kion', ['trozo', 'trozos'], { use: parts, expiry: { kind: 'date', days: 20 } }),
  piece('tortillas', 'otros-fridge', 'Tortillas rapiditas integrales', ['paquete', 'paquetes'], { use: whole(1), expiry: { kind: 'date', days: 10 }, par: 1 }),
  piece('arveja-fresca', 'verdes', 'Arvejas (frescas)', ['kg', 'kg'], { buy: [kilo(1)], use: parts, expiry: { kind: 'date', days: 10 }, par: 1 }),

  // Mascotas: paraguas no son consumibles — se registran como préstamo, ver lib/loans.ts
)

/** Unidad y factor para editar cantidades a mano (kg/L cuando el lote es grande, si no g/ml o piezas). */
export function editUnit(article: Article, reference: number): { label: string; factor: number } {
  if (article.tracking === 'measure') {
    const liquidUnit = article.unit[0] === 'ml'
    const big = reference >= 1500
    return liquidUnit ? (big ? { label: 'L', factor: 1000 } : { label: 'ml', factor: 1 }) : big ? { label: 'kg', factor: 1000 } : { label: 'g', factor: 1 }
  }
  return { label: article.unit[1], factor: 1 }
}

export const articleById = (id: string) => articles.find((article) => article.id === id)

/* ------------------------- productos creados por el usuario ------------------------- */

let archivedCustom: Article[] = []

/** Sincroniza los productos nuevos con el catálogo (idempotente): los vivos entran a `articles`; los archivados solo sirven para mostrar su nombre. */
export function syncCustomArticles(live: Article[], archived: Article[] = []) {
  for (let index = articles.length - 1; index >= 0; index--) if (articles[index].custom) articles.splice(index, 1)
  articles.push(...live.map((article) => ({ ...article, custom: true })))
  archivedCustom = archived
}

/** Nombre de un producto aunque esté archivado (para el historial). */
export const articleName = (id: string) => articleById(id)?.name ?? archivedCustom.find((article) => article.id === id)?.name ?? id

/** Zonas donde se puede guardar un producto nuevo, con su etiqueta y sitio. */
export const ZONE_CHOICES: { zone: StockZone; label: string; room: 'Cocina' | 'Baño' }[] = [
  { zone: 'fridge', label: 'Refrigeradora', room: 'Cocina' },
  { zone: 'freezer', label: 'Congelador', room: 'Cocina' },
  { zone: 'pantry', label: 'Alacena', room: 'Cocina' },
  { zone: 'fruit', label: 'Frutero', room: 'Cocina' },
  { zone: 'cabinet', label: 'Gabinete de toallas', room: 'Baño' },
  { zone: 'shelf', label: 'Estante', room: 'Baño' },
  { zone: 'firstaid', label: 'Botiquín', room: 'Baño' },
  { zone: 'sink', label: 'Lavabo', room: 'Baño' },
  { zone: 'cleaning', label: 'Limpieza', room: 'Baño' },
]
export const zoneOfShelf = (shelfId: string) => shelves.find((shelf) => shelf.id === shelfId)?.zone ?? null
export const articlesOf = (shelfId: string) => articles.filter((article) => article.shelfId === shelfId)

/* ---------------------------------- formato ---------------------------------- */

const FRACTIONS: [number, string][] = [
  [1 / 6, '⅙'],
  [0.125, '⅛'],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]

/** 2.5 → "2½", 0.25 → "¼", 12 → "12". */
export function formatQty(value: number) {
  const whole = Math.floor(value + 0.04)
  const rest = value - whole
  if (rest < 0.06 && rest > -0.05) return String(whole)
  const hit = [...FRACTIONS].sort((a, b) => Math.abs(a[0] - rest) - Math.abs(b[0] - rest))[0]
  if (hit && Math.abs(hit[0] - rest) >= 0.04) return (Math.round(value * 10) / 10).toString().replace('.', ',')
  if (hit) return whole > 0 ? `${whole}${hit[1]}` : hit[1]
  return (Math.round(value * 10) / 10).toString().replace('.', ',')
}

export function formatGrams(grams: number) {
  return grams >= 1000 ? `${(Math.round(grams / 100) / 10).toString().replace('.', ',')} kg` : `${Math.round(grams)} g`
}

export function formatMl(ml: number) {
  return ml >= 1000 ? `${(Math.round(ml / 100) / 10).toString().replace('.', ',')} L` : `${Math.round(ml)} ml`
}

/** "3 cebollas", "½ caja", "6,1 kg". */
export function formatAmount(article: Article, amount: number) {
  if (article.tracking === 'measure') return article.unit[0] === 'ml' ? formatMl(amount) : formatGrams(amount)
  return `${formatQty(amount)} ${amount <= 1.04 ? article.unit[0] : article.unit[1]}`
}

/** Cantidad de una compra en unidad base para la opción y las piezas por kilo dados. */
export function buyAmount(article: Article, option: BuyOption, perKg?: number | null) {
  if (option.amount !== undefined) return option.amount
  const kg = option.kg ?? 1
  return article.tracking === 'measure' ? Math.round(kg * 1000) : Math.round(kg * (perKg ?? article.perKg ?? 1))
}

/** Cantidad de referencia para la barra: lo que se compra normalmente. */
export const parOf = (article: Article) => article.par ?? buyAmount(article, article.buy[0])
