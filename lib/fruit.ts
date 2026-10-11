import type { Article } from './catalog'
import { daysBetween } from './days'
import type { Lot } from './lots'

/* Madurez de la fruta: cada lote guarda una "puntuación" (0 = verde, 1 = en su punto, 2 = pasada) y el día en que se midió.
   La puntuación sube sola con los días según lo rápido que madura cada fruta (`ripenDays` = días por etapa). */

export type Ripeness = 'verde' | 'punto' | 'consumir'

export const RIPENESS: Record<Ripeness, { label: string; color: string; fill: number; score: number }> = {
  verde: { label: 'Aún no', color: 'var(--hud-ok)', fill: 33, score: 0.5 },
  punto: { label: 'En su punto', color: 'var(--hud-warn)', fill: 66, score: 1.5 },
  consumir: { label: 'Urgente', color: 'var(--hud-danger)', fill: 100, score: 2.3 },
}

export const RIPENESS_CHOICES: { id: Ripeness; label: string }[] = [
  { id: 'verde', label: 'Verde' },
  { id: 'punto', label: 'En su punto' },
  { id: 'consumir', label: 'Muy madura' },
]

export const stageOf = (score: number): Ripeness => (score < 1 ? 'verde' : score < 2 ? 'punto' : 'consumir')

export function lotScore(lot: Lot, article: Article, today: string) {
  const base = lot.ripe ?? { score: RIPENESS.punto.score, at: lot.boughtAt }
  const per = article.ripenDays ?? 4
  return Math.min(3, base.score + Math.max(0, daysBetween(base.at, today)) / per)
}

export type FruitStatus = { stage: Ripeness | null; score: number; note: string }

/** Estado de una fruta según su lote más madura (es la que hay que comer primero). */
export function fruitStatus(article: Article, activeLots: Lot[], today: string): FruitStatus {
  if (activeLots.length === 0) return { stage: null, score: 0, note: 'Sin stock: anota la compra' }
  const score = Math.max(...activeLots.map((lot) => lotScore(lot, article, today)))
  const stage = stageOf(score)
  const per = article.ripenDays ?? 4
  const days = (threshold: number) => Math.max(1, Math.ceil((threshold - score) * per))
  const note =
    stage === 'consumir'
      ? 'Pasada: comer hoy o cocinar (queque, batido)'
      : stage === 'punto'
        ? `En su punto · urgente en ~${days(2)} ${days(2) === 1 ? 'día' : 'días'}`
        : `Madura en ~${days(1)} ${days(1) === 1 ? 'día' : 'días'}`
  return { stage, score, note }
}
