import { type Article, bag, type BuyOption, G, halves, one, parts, type UseOption, whole } from './catalog'

/* Tipos de producto: plantillas con las reglas por defecto (cómo se cuenta, cómo se compra/usa, cuánto dura).
   Un producto nuevo se crea a partir de un tipo y guarda una copia de esas reglas, así que cambiar un tipo
   más adelante nunca altera productos ya creados. */

export type Mode = 'units' | 'measure'

export type ProductType = {
  id: string
  name: string
  example: string
  modes: Mode[]
  /** Unidad de medida cuando se cuenta por cantidad (`measure`). */
  measureUnit: 'g' | 'ml'
  /** Sustantivo por defecto cuando se cuenta por piezas. */
  noun: [string, string]
  /** Qué botones de uso se ofrecen al contar por piezas. */
  unitUse: 'whole' | 'parts' | 'halves'
  /** Fecha impresa (o de consumo) que se elige al comprar; `days` es la sugerencia. `null` = sin fecha. */
  printedDays: number | null
  /** Días de vida una vez abierto (dos fases), con sus opciones. */
  openLife?: { default: number; choices: number[] }
  /** Duración en uso (piezas duraderas): dura estos días desde que se empieza a usar. */
  inUseLife?: { default: number; choices: number[] }
  passive?: boolean
  ripenDays?: number
  par: number
}

export const productTypes: ProductType[] = [
  { id: 'fresco', name: 'Fresco perecible', example: 'pescado, pollo, verduras', modes: ['measure', 'units'], measureUnit: 'g', noun: ['pieza', 'piezas'], unitUse: 'whole', printedDays: 3, par: 2 },
  { id: 'congelado', name: 'Congelado', example: 'carnes, arvejas, helados', modes: ['measure', 'units'], measureUnit: 'g', noun: ['bolsa', 'bolsas'], unitUse: 'parts', printedDays: 90, par: 2 },
  { id: 'frasco', name: 'Frasco de dos fases', example: 'mermelada, mostaza, salsas', modes: ['units'], measureUnit: 'g', noun: ['frasco', 'frascos'], unitUse: 'parts', printedDays: 365, openLife: { default: 60, choices: [15, 30, 60, 90, 180, 365] }, par: 2 },
  { id: 'seco', name: 'Seco empaquetado', example: 'arroz, fideos, harina', modes: ['measure'], measureUnit: 'g', noun: ['paquete', 'paquetes'], unitUse: 'parts', printedDays: null, passive: true, par: 1000 },
  { id: 'lacteo', name: 'Lácteo o bebida', example: 'leche, yogur, jugo', modes: ['units'], measureUnit: 'g', noun: ['caja', 'cajas'], unitUse: 'parts', printedDays: 14, openLife: { default: 5, choices: [3, 5, 7, 14] }, par: 2 },
  { id: 'liquido', name: 'Líquido de uso', example: 'jabón, detergente, shampoo', modes: ['measure'], measureUnit: 'ml', noun: ['botella', 'botellas'], unitUse: 'parts', printedDays: null, passive: true, par: 500 },
  { id: 'duradero', name: 'Pieza duradera', example: 'esponjas, cepillos, paños', modes: ['units'], measureUnit: 'g', noun: ['pieza', 'piezas'], unitUse: 'whole', printedDays: null, inUseLife: { default: 90, choices: [30, 60, 90, 180, 365] }, par: 4 },
  { id: 'medicina', name: 'Medicina', example: 'pastillas, jarabes, curitas', modes: ['units'], measureUnit: 'g', noun: ['caja', 'cajas'], unitUse: 'whole', printedDays: 365, par: 2 },
  { id: 'fruta', name: 'Fruta', example: 'mango, uvas, piña', modes: ['units'], measureUnit: 'g', noun: ['fruta', 'frutas'], unitUse: 'whole', printedDays: null, ripenDays: 4, par: 4 },
  // Condimentos: frascos de cocina que casi no se vencen (sal, vinagre, especias) — a diferencia de
  // "Frasco de dos fases" no cargan una fecha de vida corta tras abrirlos, solo fracción restante.
  { id: 'condimento-liquido', name: 'Condimento líquido', example: 'sillao, vinagre, algarrobina', modes: ['measure'], measureUnit: 'ml', noun: ['frasco', 'frascos'], unitUse: 'parts', printedDays: 730, par: 500 },
  { id: 'condimento-seco', name: 'Condimento seco', example: 'comino, pimienta, orégano, ajinomoto', modes: ['measure'], measureUnit: 'g', noun: ['frasco', 'frascos'], unitUse: 'parts', printedDays: 730, par: 150 },
  // Sólidos que se gastan poco a poco pero no son líquidos (mililitros no les calza): jabón de barra,
  // detergente en pasta, margarina. Se comportan como "Líquido de uso" (pasan solos, sin fecha) pero en gramos.
  { id: 'solido', name: 'Sólido de uso', example: 'jabón de barra, detergente en pasta, margarina', modes: ['measure'], measureUnit: 'g', noun: ['pieza', 'piezas'], unitUse: 'parts', printedDays: null, passive: true, par: 200 },
]
export const productTypeById = (id: string) => productTypes.find((type) => type.id === id)

const ml = (...values: number[]): UseOption[] => values.map((value) => ({ id: `m${value}`, label: value >= 1000 ? `${value / 1000} L` : `${value} ml`, amount: value }))
const gramsUse = (...values: number[]): UseOption[] => values.map((value) => ({ id: `g${value}`, label: value >= 1000 ? `${value / 1000} kg` : `${value} g`, amount: value }))
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export type Draft = {
  name: string
  typeId: string
  mode: Mode
  noun: [string, string]
  shelfId: string
  openLife: number | null
  inUseLife: number | null
}

export const defaultMode = (type: ProductType): Mode => type.modes[0]

/** Valores iniciales del borrador al elegir un tipo. */
export function draftForType(type: ProductType, base: Partial<Draft> & { name: string; shelfId: string }): Draft {
  return { typeId: type.id, mode: defaultMode(type), noun: type.noun, openLife: type.openLife?.default ?? null, inUseLife: type.inUseLife?.default ?? null, ...base }
}

/** Convierte un borrador en un producto completo con todas las reglas ya copiadas. */
export function buildArticle(draft: Draft, id: string): Article {
  const type = productTypeById(draft.typeId) ?? productTypes[0]
  const measure = draft.mode === 'measure'
  const noun = draft.noun
  let buy: BuyOption[]
  let use: UseOption[]
  if (measure) {
    buy =
      type.measureUnit === 'ml'
        ? [bag('Botella 500 ml', 500), bag('Botella 1 L', 1000), bag('Botella 2 L', 2000)]
        : [bag('Paquete 250 g', 250), bag('Paquete 500 g', 500), bag('Paquete 1 kg', 1000), bag('Paquete 2 kg', 2000)]
    use = type.measureUnit === 'ml' ? ml(10, 25, 50, 100) : gramsUse(100, 250, 500, 1000)
  } else {
    buy = [one(cap(noun[0])), { id: 'p6', label: `Pack de 6`, amount: 6 }]
    use = type.unitUse === 'whole' ? whole(1, 2, 3) : type.unitUse === 'halves' ? halves : parts
  }
  const article: Article = {
    id,
    shelfId: draft.shelfId,
    name: draft.name.trim(),
    tracking: measure ? 'measure' : 'units',
    unit: measure ? (type.measureUnit === 'ml' ? ['ml', 'ml'] : G) : noun,
    buy,
    use,
    expiry: type.inUseLife ? { kind: 'shelf', days: draft.inUseLife ?? type.inUseLife.default } : type.printedDays === null ? { kind: 'none' } : { kind: 'date', days: type.printedDays },
    par: measure ? (type.measureUnit === 'ml' ? 500 : type.par) : type.par,
    passive: type.passive,
    custom: true,
    typeId: type.id,
  }
  if (draft.openLife !== null && type.openLife) article.openLife = draft.openLife
  if (type.ripenDays) article.ripenDays = type.ripenDays
  return article
}

/** Cómo se describe la duración de un borrador (para explicarla al usuario). */
export function lifeSummary(draft: Draft): string[] {
  const type = productTypeById(draft.typeId)
  if (!type) return []
  const lines: string[] = []
  if (type.inUseLife) lines.push(`En uso: dura ${draft.inUseLife ?? type.inUseLife.default} días desde que lo empiezas a usar.`)
  else if (type.printedDays !== null) lines.push('Sellado: vence en la fecha impresa, que eliges al comprar.')
  else if (!type.ripenDays) lines.push('No caduca: no se le pone fecha.')
  if (type.openLife) lines.push(`Abierto: ${draft.openLife ?? type.openLife.default} días desde que lo abres (o la fecha impresa, lo que llegue primero).`)
  if (type.ripenDays) lines.push('Madura sola: la app calcula el punto según los días.')
  if (type.passive) lines.push('Uso diario: la cantidad baja sola según tu ritmo.')
  return lines
}
