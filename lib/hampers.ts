import { daysBetween } from './days'
import type { Movement } from './lots'
import type { Rect } from './scene'

/* Canastas de ropa sucia del gabinete del baño. Cada una guarda qué tan llena está;
   con eso la app avisa cuándo lavar y aprende cada cuántos días se llena. */

export type HamperDef = { id: string; name: string; who: string; color: string; rect: Rect }

/** Rectángulos en % de la ilustración del gabinete (gabinete_izquierdo). */
export const hamperDefs: HamperDef[] = [
  { id: 'mama', name: 'Mamá', who: 'la canasta de Mamá', color: '#8fb7d9', rect: { x: 14, y: 38.3, w: 22.5, h: 19.5 } },
  { id: 'nosotras', name: 'Nosotras', who: 'la canasta de Nosotras', color: '#e0954f', rect: { x: 36.5, y: 38.3, w: 21.5, h: 19.5 } },
  { id: 'hermanos', name: 'Hermanos', who: 'la canasta de Hermanos', color: '#9bb05a', rect: { x: 58, y: 38.3, w: 22, h: 19.5 } },
]
export const hamperDef = (id: string) => hamperDefs.find((entry) => entry.id === id)

export type Hamper = {
  id: string
  /** 0 = vacía (recién lavada) … 100 = llena. */
  level: number
  /** Día de la última revisión. */
  updatedAt: string
  /** Día en que quedó vacía por última vez. */
  emptiedAt: string
  /** Días que tardó en llenarse en los últimos lavados (para aprender el ritmo). */
  cycles: number[]
  by: string
}

export const HAMPER_LEVELS = [
  { label: 'Vacía', hint: 'ya lavé', value: 0 },
  { label: '¼', hint: '', value: 25 },
  { label: '½', hint: '', value: 50 },
  { label: '¾', hint: '', value: 75 },
  { label: 'Llena', hint: 'a punto de rebosar', value: 100 },
]

export type HamperTone = 'ok' | 'soon' | 'urgent'
export type HamperStatus = {
  tone: HamperTone
  label: string
  /** Días hasta llenarse (estimado), o `null` si aún no hay datos. */
  daysToFull: number | null
  detail: string
}

const URGENT = 90
const SOON = 65

export function hamperStatus(hamper: Hamper, today: string): HamperStatus {
  const level = hamper.level
  const since = Math.max(0, daysBetween(hamper.emptiedAt, today))
  const avgCycle = hamper.cycles.length ? hamper.cycles.reduce((sum, value) => sum + value, 0) / hamper.cycles.length : null
  let daysToFull: number | null = null
  if (level < 100) {
    if (avgCycle !== null) daysToFull = Math.max(0, Math.round(avgCycle - since))
    else if (since >= 2 && level > 0) daysToFull = Math.max(0, Math.round(((100 - level) / level) * since))
  }
  const tone: HamperTone = level >= URGENT ? 'urgent' : level >= SOON ? 'soon' : 'ok'
  const label = level >= URGENT ? 'Llena · lavar con urgencia' : level >= SOON ? 'Casi llena · lavar pronto' : level === 0 ? 'Vacía' : `${level}% llena`
  const detail =
    level >= URGENT
      ? 'Ya no cabe más ropa: hay que lavarla hoy.'
      : daysToFull === null
        ? 'Aprendiendo cada cuánto se llena: se afina con cada lavado.'
        : daysToFull === 0
          ? 'Debería estar por llenarse: confírmalo con “Llena”.'
          : `Se llena en ~${daysToFull} ${daysToFull === 1 ? 'día' : 'días'} según tu ritmo.`
  return { tone, label, daysToFull, detail }
}

export const urgentHampers = (hampers: Hamper[]) => hampers.filter((entry) => entry.level >= URGENT)
export const joinNames = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`)

export type HamperAction = { type: 'hamper'; id: string; level: number }
export type HamperOutcome = { hampers: Hamper[]; changed: Hamper | null; message: string; movements: Movement[] }

export function applyHamper(hampers: Hamper[], action: HamperAction, ctx: { today: string; by: string }): HamperOutcome {
  const current = hampers.find((entry) => entry.id === action.id)
  const def = hamperDef(action.id)
  if (!current || !def) return { hampers, changed: null, message: '', movements: [] }
  const level = Math.max(0, Math.min(100, Math.round(action.level)))
  let { emptiedAt, cycles } = current
  if (level === 0) {
    const lasted = daysBetween(emptiedAt, ctx.today)
    // Solo cuenta como ciclo si la canasta llegó a estar bastante llena y pasó al menos un día.
    if (current.level >= 50 && lasted >= 1) cycles = [...cycles, lasted].slice(-5)
    emptiedAt = ctx.today
  }
  const next: Hamper = { ...current, level, updatedAt: ctx.today, emptiedAt, cycles, by: ctx.by }
  const message =
    level === 0
      ? `Canasta de ${def.name}: vacía · ¡ropa lavada!`
      : level >= URGENT
        ? `Canasta de ${def.name} llena: hay que lavar con urgencia`
        : `Canasta de ${def.name}: ${level}% llena`
  const movements: Movement[] = current.level === level ? [] : [{ articleId: `hamper:${def.id}`, lotId: '', kind: 'hamper', amount: level, detail: `Canasta de ${def.name}: ${current.level}% → ${level}%${level === 0 ? ' · lavada' : ''}` }]
  return { hampers: hampers.map((entry) => (entry.id === next.id ? next : entry)), changed: next, message, movements }
}

export function seedHampers(today: string): Hamper[] {
  const levels: Record<string, number> = { mama: 50, nosotras: 25, hermanos: 25 }
  return hamperDefs.map((def) => ({ id: def.id, level: levels[def.id] ?? 0, updatedAt: today, emptiedAt: today, cycles: [], by: 'Inicio' }))
}
