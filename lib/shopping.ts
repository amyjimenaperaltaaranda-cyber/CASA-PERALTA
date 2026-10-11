import { type Article, articles, buyAmount, type BuyOption, formatAmount, shelves } from './catalog'
import { addDays } from './days'
import { type ArticleSummary, learnedPerKg, type Lot, type LotAction, summarize } from './lots'

/* Lista de compras: se arma sola con lo que se agotó, queda poco, se acaba pronto o venció. */

export type Room = 'Cocina' | 'Baño'
export type Reason = 'out' | 'expired' | 'low' | 'soon' | 'expiring'
export type ShopItem = { article: Article; sum: ArticleSummary; room: Room; reason: Reason; detail: string; rank: number }

const KITCHEN_ZONES = new Set(['fridge', 'pantry'])

export function roomOf(article: Article): Room {
  if (article.id === 'croquetas') return 'Cocina'
  const zone = shelves.find((shelf) => shelf.id === article.shelfId)?.zone
  return zone && !KITCHEN_ZONES.has(zone) ? 'Baño' : 'Cocina'
}

export const REASON_LABEL: Record<Reason, string> = { out: 'Agotado', expired: 'Vencido', low: 'Queda poco', soon: 'Se acaba pronto', expiring: 'Vence pronto' }

export function buildShoppingList(lots: Lot[], today: string): ShopItem[] {
  const items: ShopItem[] = []
  for (const article of articles) {
    const sum = summarize(article, lots, today)
    if (!sum.inUse) continue
    let reason: Reason | null = null
    let detail = ''
    let rank = 0
    if (sum.lots.length === 0) {
      reason = 'out'
      detail = 'Se acabó'
      rank = 0
    } else if (sum.nearest && sum.nearest.tone === 'expired') {
      reason = 'expired'
      detail = 'Lote vencido: reponer'
      rank = 1
    } else if (sum.level <= 25) {
      reason = 'low'
      detail = `Quedan ${formatAmount(article, sum.total)}`
      rank = 2
    } else if (sum.daysLeft !== null && sum.daysLeft <= 5) {
      const days = Math.max(0, Math.floor(sum.daysLeft))
      reason = 'soon'
      detail = days === 0 ? 'Se acaba hoy' : `Alcanza ~${days} ${days === 1 ? 'día' : 'días'}`
      rank = 3
    } else if (sum.nearest && sum.nearest.days <= 3) {
      reason = 'expiring'
      detail = sum.nearest.days === 0 ? 'Vence hoy' : `Vence en ${sum.nearest.days} ${sum.nearest.days === 1 ? 'día' : 'días'}`
      rank = 4
    }
    if (reason) items.push({ article, sum, room: roomOf(article), reason, detail, rank })
  }
  return items.sort((a, b) => a.rank - b.rank || a.article.name.localeCompare(b.article.name))
}

/** Compra rápida de una presentación (1 unidad) con la fecha de vencimiento sugerida. */
export function quickBuy(article: Article, option: BuyOption, lots: Lot[]): LotAction {
  const perKg = learnedPerKg(lots, article) ?? article.perKg ?? null
  const amount = buyAmount(article, option, perKg)
  return {
    type: 'buy',
    articleId: article.id,
    lotId: crypto.randomUUID(),
    amount,
    kg: option.kg ?? null,
    expiresInDays: article.expiry.kind === 'date' ? article.expiry.days : null,
  }
}

export function shoppingText(items: ShopItem[], household: string, today: string) {
  const lines = [`Lista de compras · ${household} · ${addDays(today, 0)}`]
  for (const room of ['Cocina', 'Baño'] as const) {
    const list = items.filter((item) => item.room === room)
    if (!list.length) continue
    lines.push('', room.toUpperCase())
    for (const item of list) lines.push(`• ${item.article.name} (${item.detail.toLowerCase()})`)
  }
  return lines.join('\n')
}
