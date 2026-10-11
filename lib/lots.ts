import { type Article, articleById, articles, articlesOf, formatAmount, formatGrams, parOf, type Shelf, shelves } from './catalog'
import { addDays, daysBetween, formatDayShort } from './days'
import { fruitStatus, RIPENESS } from './fruit'

/* Lotes: cada compra es un lote con su propia fecha de compra, cantidad y vencimiento.
   Lo que se usa sale primero del lote que vence antes (FEFO). Cada vez que alguien usa algo o revisa cuánto queda,
   el lote guarda una "observación"; con ellas la app aprende el ritmo de consumo y proyecta cuándo se acaba. */

export type Check = { at: string; amount: number }

export type Lot = {
  id: string
  articleId: string
  boughtAt: string
  /** Cantidad al comprar (unidad base del insumo). */
  initial: number
  /** Última cantidad confirmada. */
  amount: number
  checkedAt: string
  /** Observaciones reales (compra, usos, revisiones) para aprender el ritmo. */
  checks: Check[]
  expiresAt: string | null
  openedAt: string | null
  closedAt: string | null
  /** Kilos comprados (si se compró por kilo): permite aprender cuántas piezas trae un kilo. */
  kg: number | null
  by: string
  /** Borrado suave: el lote no se elimina, solo se oculta y puede restaurarse. */
  deletedAt: string | null
  /** Madurez (solo frutas): puntuación medida el día `at`. */
  ripe: { score: number; at: string } | null
}

/** Cambios que se pueden hacer a mano sobre un lote para partir de valores reales. */
export type EditPatch = {
  boughtAt?: string
  initial?: number
  amount?: number
  expiresAt?: string | null
  ripeScore?: number
}

export type LotAction =
  | { type: 'buy'; articleId: string; lotId: string; amount: number; kg: number | null; expiresInDays: number | null; boughtAt?: string; ripeScore?: number }
  | { type: 'use'; articleId: string; amount: number }
  | { type: 'check'; articleId: string; fraction: number; lotId?: string }
  | { type: 'finish'; lotId: string }
  | { type: 'discard'; lotId: string }
  | { type: 'edit'; lotId: string; patch: EditPatch }
  | { type: 'delete'; lotId: string }
  | { type: 'restore'; lotId: string }
  | { type: 'ripe'; articleId: string; score: number }

export type MovementKind = 'create' | 'buy' | 'use' | 'check' | 'finish' | 'discard' | 'edit' | 'delete' | 'restore' | 'hamper' | 'loan'
export type Movement = { articleId: string; lotId: string; kind: MovementKind; amount: number; detail?: string }

/** Movimiento guardado en el historial unificado (nunca se borra ni se edita). */
export type HistoryEntry = Movement & { id: string; at: string; by: string }

export const isLotAction = (action: { type: string }): action is LotAction => ['buy', 'use', 'check', 'finish', 'discard', 'edit', 'delete', 'restore', 'ripe'].includes(action.type)

const round3 = (value: number) => Math.round(value * 1000) / 1000
const EPOCH = '2000-01-01'
const FAR = '9999-12-31'

/* ------------------------------ orden y estados ------------------------------ */

const fefo = (a: Lot, b: Lot) => (a.expiresAt ?? FAR).localeCompare(b.expiresAt ?? FAR) || a.boughtAt.localeCompare(b.boughtAt) || a.id.localeCompare(b.id)

export const activeLots = (lots: Lot[], articleId: string) => lots.filter((lot) => lot.articleId === articleId && lot.closedAt === null).sort(fefo)

export type ExpiryState = { tone: 'none' | 'ok' | 'soon' | 'expired'; days: number | null; label: string }

export function expiryOf(lot: Lot, article: Article, today: string): ExpiryState {
  if (lot.expiresAt === null) {
    return { tone: 'none', days: null, label: (article.expiry.kind === 'shelf' || article.openLife) && lot.openedAt === null ? 'Sin abrir' : 'Sin fecha' }
  }
  const days = daysBetween(today, lot.expiresAt)
  if (days < 0) return { tone: 'expired', days, label: `Vencido hace ${-days} ${days === -1 ? 'día' : 'días'}` }
  if (days === 0) return { tone: 'soon', days, label: 'Vence hoy' }
  if (days <= 3) return { tone: 'soon', days, label: `Vence en ${days} ${days === 1 ? 'día' : 'días'}` }
  return { tone: 'ok', days, label: `Vence en ${days} días` }
}

/* ------------------------------ ritmo de consumo ------------------------------ */

/** Ritmo aprendido (unidad base por día): lo consumido entre observaciones reales / días observados. */
export function learnRate(articleLots: Lot[], today: string, windowDays = 90): number | null {
  const recent = articleLots.filter((lot) => lot.checks.length > 0 && daysBetween(lot.checks[lot.checks.length - 1].at, today) <= windowDays)
  let consumed = 0
  const spans: [number, number][] = []
  for (const lot of recent) {
    const first = lot.checks[0]
    const last = lot.checks[lot.checks.length - 1]
    consumed += Math.max(0, first.amount - last.amount)
    spans.push([daysBetween(EPOCH, first.at), daysBetween(EPOCH, last.at)])
  }
  spans.sort((a, b) => a[0] - b[0])
  let coverage = 0
  let current: [number, number] | null = null
  for (const span of spans) {
    if (current && span[0] <= current[1]) current[1] = Math.max(current[1], span[1])
    else {
      if (current) coverage += current[1] - current[0]
      current = [span[0], span[1]]
    }
  }
  if (current) coverage += current[1] - current[0]
  return coverage >= 3 ? consumed / coverage : null
}

/** Piezas por kilo aprendidas de las últimas compras por kilo (promedio de las 3 más recientes). */
export function learnedPerKg(lots: Lot[], article: Article): number | null {
  const samples = lots
    .filter((lot) => lot.articleId === article.id && lot.kg && lot.by !== 'Inicio')
    .sort((a, b) => b.boughtAt.localeCompare(a.boughtAt))
    .slice(0, 3)
    .map((lot) => lot.initial / (lot.kg as number))
  return samples.length ? Math.round((samples.reduce((sum, value) => sum + value, 0) / samples.length) * 10) / 10 : null
}

/** Cantidad estimada hoy. En costales de uso diario baja sola entre revisiones; en el resto es la última confirmada. */
export function estimate(lot: Lot, article: Article, rate: number | null, today: string) {
  if (!article.passive || !rate) return lot.amount
  return Math.max(0, lot.amount - rate * Math.max(0, daysBetween(lot.checkedAt, today)))
}

/* ---------------------------------- resúmenes ---------------------------------- */

export type ArticleSummary = {
  article: Article
  lots: Lot[]
  total: number
  reference: number
  level: number
  /** Ritmo aprendido de observaciones reales; `null` mientras no haya datos. */
  learnedRate: number | null
  /** Ritmo usado para proyectar: el aprendido o, si no hay, el previsto. */
  rate: number | null
  daysLeft: number | null
  runsOutOn: string | null
  nearest: { days: number; tone: ExpiryState['tone'] } | null
  inUse: boolean
}

export function summarize(article: Article, lots: Lot[], today: string): ArticleSummary {
  const own = lots.filter((lot) => lot.articleId === article.id)
  const active = own.filter((lot) => lot.closedAt === null).sort(fefo)
  const learnedRate = learnRate(own, today)
  const rate = learnedRate ?? article.plannedPerDay ?? null
  const amounts = active.map((lot) => estimate(lot, article, rate, today))
  const total = round3(amounts.reduce((sum, value) => sum + value, 0))
  const reference = Math.max(active.reduce((sum, lot) => sum + lot.initial, 0), parOf(article))
  const level = active.length === 0 ? 0 : Math.max(0, Math.min(100, Math.round((100 * total) / reference)))
  const daysLeft = rate && rate > 0 && active.length > 0 ? total / rate : null
  const dated = active.map((lot, index) => ({ lot, amount: amounts[index] })).filter((entry) => entry.lot.expiresAt !== null && entry.amount > 0)
  const states = dated.map((entry) => expiryOf(entry.lot, article, today)).filter((state) => state.days !== null)
  const worst = states.sort((a, b) => (a.days as number) - (b.days as number))[0]
  const recentlyClosed = own.some((lot) => lot.closedAt !== null && daysBetween(lot.closedAt, today) <= 45)
  return {
    article,
    lots: active,
    total,
    reference,
    level,
    learnedRate,
    rate,
    daysLeft,
    // se acaba durante el día que resulta de sumar los días completos que alcanzan
    runsOutOn: daysLeft === null ? null : addDays(today, Math.floor(daysLeft)),
    nearest: worst ? { days: worst.days as number, tone: worst.tone } : null,
    inUse: active.length > 0 || recentlyClosed,
  }
}

export type ShelfSummary = { shelf: Shelf; articles: ArticleSummary[]; level: number; low: ArticleSummary[]; expiring: ArticleSummary[] }

export function summarizeShelf(shelf: Shelf, lots: Lot[], today: string): ShelfSummary {
  const all = articlesOf(shelf.id).map((article) => summarize(article, lots, today))
  const used = all.filter((entry) => entry.inUse)
  const level = used.length ? Math.round(used.reduce((sum, entry) => sum + entry.level, 0) / used.length) : 0
  return {
    shelf,
    articles: all,
    level,
    low: used.filter((entry) => entry.level <= 25 || (entry.daysLeft !== null && entry.daysLeft <= 5)),
    expiring: all.filter((entry) => entry.nearest !== null && entry.nearest.days <= 3),
  }
}

const names = (entries: ArticleSummary[]) => entries.map((entry) => entry.article.name.toLowerCase())
const summary = (list: string[], verb: string) => (list.length <= 2 ? `${verb} ${list.join(' y ')}` : `${list.length} ${verb === 'Reponer' ? 'por reponer' : 'por vencer'}`)

/** Nivel medio de una zona (para tarjetas de resumen). */
export function zoneLevel(zone: string, lots: Lot[], today: string) {
  const list = shelves.filter((shelf) => shelf.zone === zone).map((shelf) => summarizeShelf(shelf, lots, today)).filter((entry) => entry.articles.some((article) => article.inUse))
  return list.length ? Math.round(list.reduce((sum, entry) => sum + entry.level, 0) / list.length) : 0
}

export function computeHudStats(lots: Lot[], today: string) {
  const zone = (which: 'pantry' | 'fridge') => {
    const list = shelves.filter((shelf) => (which === 'fridge' ? shelf.zone === 'fridge' || shelf.zone === 'freezer' : shelf.zone === which)).map((shelf) => summarizeShelf(shelf, lots, today)).filter((entry) => entry.articles.length > 0)
    const value = list.length ? Math.round(list.reduce((sum, entry) => sum + entry.level, 0) / list.length) : 0
    const low = list.flatMap((entry) => entry.low)
    const expiring = list.flatMap((entry) => entry.expiring)
    return { value, low, expiring }
  }
  const pantry = zone('pantry')
  const fridge = zone('fridge')
  const fruitStates = articles.filter((article) => article.ripenDays).map((article) => fruitStatus(article, activeLots(lots, article.id), today).stage)
  const inStock = fruitStates.filter((stage) => stage !== null)
  const ripe = inStock.length ? Math.round(inStock.reduce((sum, stage) => sum + (stage === 'punto' ? 100 : stage === 'verde' ? 60 : 25), 0) / inStock.length) : 0
  const restock = (low: ArticleSummary[]) => (low.length === 0 ? 'Todo en orden' : summary(names(low), 'Reponer'))
  return [
    { id: 'pantry', label: 'Despensa', value: pantry.value, detail: restock(pantry.low) },
    { id: 'fresh', label: 'Frescos', value: fridge.value, detail: fridge.expiring.length ? summary(names(fridge.expiring), 'Vence pronto:').replace('Vence pronto: ', 'Vence pronto: ') : restock(fridge.low) },
    { id: 'ripe', label: 'Madurez', value: ripe, detail: inStock.length ? `${inStock.filter((stage) => stage === 'punto').length} en su punto` : 'Sin fruta' },
  ]
}

/* ------------------------------------ acciones ------------------------------------ */

export type Outcome = { lots: Lot[]; changed: Lot[]; movements: Movement[]; message: string }

const untouched = (lots: Lot[], message: string): Outcome => ({ lots, changed: [], movements: [], message })

/** Marca el lote como abierto y, si el insumo dura X días una vez abierto, fija su vencimiento. */
function open(lot: Lot, article: Article, today: string): Lot {
  if (lot.openedAt !== null) return lot
  // Dos fases: vence lo que llegue primero entre la fecha impresa y (abierto + días de vida abierto).
  const life = article.openLife ?? (article.expiry.kind === 'shelf' ? article.expiry.days : null)
  if (life === null) return { ...lot, openedAt: today }
  const byOpening = addDays(today, life)
  return { ...lot, openedAt: today, expiresAt: lot.expiresAt === null || byOpening < lot.expiresAt ? byOpening : lot.expiresAt }
}

function record(lot: Lot, amount: number, today: string): Lot {
  const next = round3(Math.max(0, amount))
  return {
    ...lot,
    amount: next,
    checkedAt: today,
    checks: [...lot.checks, { at: today, amount: next }],
    closedAt: next <= 0.0005 ? today : null,
  }
}

const lower = (article: Article) => article.name.toLowerCase()

export function applyLotAction(lots: Lot[], action: LotAction, ctx: { today: string; by: string; trash?: Lot[] }): Outcome {
  const { today, by } = ctx

  if (action.type === 'buy') {
    const article = articleById(action.articleId)
    if (!article || lots.some((lot) => lot.id === action.lotId)) return untouched(lots, '')
    const amount = round3(action.amount)
    const boughtAt = action.boughtAt && action.boughtAt <= today ? action.boughtAt : today
    const lot: Lot = {
      id: action.lotId,
      articleId: article.id,
      boughtAt,
      initial: amount,
      amount,
      checkedAt: boughtAt,
      checks: [{ at: boughtAt, amount }],
      expiresAt: action.expiresInDays === null ? null : addDays(boughtAt, action.expiresInDays),
      openedAt: null,
      closedAt: null,
      kg: action.kg,
      by,
      deletedAt: null,
      ripe: article.ripenDays ? { score: action.ripeScore ?? RIPENESS.punto.score, at: boughtAt } : null,
    }
    return {
      lots: [...lots, lot],
      changed: [lot],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'buy', amount, detail: `Creado: ${formatAmount(article, amount)} · ingreso ${formatDayShort(boughtAt)}` }],
      message: `Compra guardada: ${formatAmount(article, amount)} de ${lower(article)}`,
    }
  }

  if (action.type === 'finish') {
    const lot = lots.find((entry) => entry.id === action.lotId)
    const article = lot && articleById(lot.articleId)
    if (!lot || !article || lot.closedAt !== null) return untouched(lots, '')
    const closed = record(open(lot, article, today), 0, today)
    const lasted = daysBetween(lot.boughtAt, today)
    return {
      lots: lots.map((entry) => (entry.id === lot.id ? closed : entry)),
      changed: [closed],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'finish', amount: lot.amount }],
      message: lasted >= 1 ? `${article.name}: lote agotado · duró ${lasted} ${lasted === 1 ? 'día' : 'días'} · añadido a la lista de compras` : `${article.name}: lote agotado · añadido a la lista de compras`,
    }
  }

  if (action.type === 'discard') {
    // Igual que "finish" (el lote queda cerrado y entra a la lista de compras), pero con su propio
    // registro en el historial: esto se malogró, no se consumió a su ritmo normal.
    const lot = lots.find((entry) => entry.id === action.lotId)
    const article = lot && articleById(lot.articleId)
    if (!lot || !article || lot.closedAt !== null) return untouched(lots, '')
    const closed = record(open(lot, article, today), 0, today)
    return {
      lots: lots.map((entry) => (entry.id === lot.id ? closed : entry)),
      changed: [closed],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'discard', amount: lot.amount, detail: 'Se malogró antes de usarse' }],
      message: `${article.name}: descartado · añadido a la lista de compras`,
    }
  }

  if (action.type === 'edit') {
    const lot = lots.find((entry) => entry.id === action.lotId)
    const article = lot && articleById(lot.articleId)
    if (!lot || !article) return untouched(lots, '')
    const patch = action.patch
    const boughtAt = patch.boughtAt && patch.boughtAt <= today ? patch.boughtAt : lot.boughtAt
    const initial = round3(Math.max(0.001, patch.initial ?? lot.initial))
    const amount = round3(Math.min(initial, Math.max(0, patch.amount ?? lot.amount)))
    const expiresAt = 'expiresAt' in patch ? (patch.expiresAt ?? null) : lot.expiresAt
    const qtyChanged = boughtAt !== lot.boughtAt || initial !== lot.initial || amount !== lot.amount
    const detail: string[] = []
    if (boughtAt !== lot.boughtAt) detail.push(`Ingreso: ${formatDayShort(lot.boughtAt)} → ${formatDayShort(boughtAt)}`)
    if (initial !== lot.initial) detail.push(`Al comprar: ${formatAmount(article, lot.initial)} → ${formatAmount(article, initial)}`)
    if (amount !== lot.amount) detail.push(`Actual: ${formatAmount(article, lot.amount)} → ${formatAmount(article, amount)}`)
    if (expiresAt !== lot.expiresAt) detail.push(`Vence: ${lot.expiresAt ? formatDayShort(lot.expiresAt) : 'sin fecha'} → ${expiresAt ? formatDayShort(expiresAt) : 'sin fecha'}`)
    if (patch.ripeScore !== undefined) detail.push('Madurez corregida')
    if (detail.length === 0) return untouched(lots, '')
    // Los datos corregidos reemplazan a los inventados: el ritmo de uso se aprende desde ellos.
    const checks: Check[] = qtyChanged ? (amount < initial ? [{ at: boughtAt, amount: initial }, { at: today, amount }] : [{ at: boughtAt, amount: initial }]) : lot.checks
    const edited: Lot = {
      ...lot,
      boughtAt,
      initial,
      amount,
      expiresAt,
      checks,
      checkedAt: qtyChanged ? (amount < initial ? today : boughtAt) : lot.checkedAt,
      closedAt: amount <= 0.0005 ? (lot.closedAt ?? today) : null,
      by: lot.by === 'Inicio' ? by : lot.by,
      ripe: patch.ripeScore !== undefined ? { score: patch.ripeScore, at: today } : lot.ripe,
    }
    return {
      lots: lots.map((entry) => (entry.id === lot.id ? edited : entry)),
      changed: [edited],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'edit', amount, detail: detail.join(' · ') }],
      message: `${article.name}: lote corregido`,
    }
  }

  if (action.type === 'delete') {
    const lot = lots.find((entry) => entry.id === action.lotId)
    const article = lot && articleById(lot.articleId)
    if (!lot || !article) return untouched(lots, '')
    const deleted: Lot = { ...lot, deletedAt: today }
    return {
      lots: lots.filter((entry) => entry.id !== lot.id),
      changed: [deleted],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'delete', amount: lot.amount, detail: `Lote del ${formatDayShort(lot.boughtAt)} (${formatAmount(article, lot.amount)}) · se puede restaurar` }],
      message: `${article.name}: lote borrado · queda en el historial y se puede restaurar`,
    }
  }

  if (action.type === 'restore') {
    const lot = (ctx.trash ?? []).find((entry) => entry.id === action.lotId)
    const article = lot && articleById(lot.articleId)
    if (!lot || !article || lots.some((entry) => entry.id === lot.id)) return untouched(lots, '')
    const restored: Lot = { ...lot, deletedAt: null }
    return {
      lots: [...lots, restored],
      changed: [restored],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'restore', amount: lot.amount, detail: `Lote del ${formatDayShort(lot.boughtAt)} restaurado` }],
      message: `${article.name}: lote restaurado`,
    }
  }

  const article = articleById(action.articleId)
  if (!article) return untouched(lots, '')
  const active = activeLots(lots, article.id)
  if (active.length === 0) return untouched(lots, `${article.name}: no hay stock registrado. Anota primero la compra.`)

  if (action.type === 'ripe') {
    const updated = active.map((lot) => ({ ...lot, ripe: { score: action.score, at: today } }))
    const byId = new Map(updated.map((lot) => [lot.id, lot]))
    const label = action.score < 1 ? 'verde' : action.score < 2 ? 'en su punto' : 'muy madura'
    return {
      lots: lots.map((entry) => byId.get(entry.id) ?? entry),
      changed: updated,
      movements: [{ articleId: article.id, lotId: updated[0].id, kind: 'check', amount: action.score, detail: `Madurez revisada: ${label}` }],
      message: `${article.name}: ${label}`,
    }
  }

  if (action.type === 'check') {
    const lot = (action.lotId && active.find((entry) => entry.id === action.lotId)) || active[0]
    if (action.fraction <= 0.001) return applyLotAction(lots, { type: 'finish', lotId: lot.id }, ctx)
    const target = Math.min(lot.initial, round3(lot.initial * action.fraction))
    const updated = record(open(lot, article, today), target, today)
    return {
      lots: lots.map((entry) => (entry.id === lot.id ? updated : entry)),
      changed: [updated],
      movements: [{ articleId: article.id, lotId: lot.id, kind: 'check', amount: target }],
      message: `${article.name}: quedan ~${formatAmount(article, target)}`,
    }
  }

  // use: sale primero del lote que vence antes
  let remaining = round3(action.amount)
  const changed: Lot[] = []
  const movements: Movement[] = []
  for (const lot of active) {
    if (remaining <= 0.0005) break
    const take = Math.min(lot.amount, remaining)
    const updated = record(open(lot, article, today), lot.amount - take, today)
    changed.push(updated)
    movements.push({ articleId: article.id, lotId: lot.id, kind: 'use', amount: round3(take) })
    remaining = round3(remaining - take)
  }
  const byId = new Map(changed.map((lot) => [lot.id, lot]))
  const left = round3(active.reduce((sum, lot) => sum + (byId.get(lot.id)?.amount ?? lot.amount), 0))
  const used = formatAmount(article, round3(action.amount - Math.max(0, remaining)))
  const message =
    remaining > 0.0005
      ? `${article.name}: solo había ${used} registrado. Revisa si falta anotar una compra.`
      : left <= 0.0005
        ? `${article.name}: usaste ${used} · se acabó · añadido a la lista de compras`
        : `${article.name}: usaste ${used} · quedan ${formatAmount(article, left)}`
  return { lots: lots.map((entry) => byId.get(entry.id) ?? entry), changed, movements, message }
}

/* -------------------------------------- inicio -------------------------------------- */

/** Un lote real, listo para fecharse relativo al día del inventario (ver `REAL_INVENTORY_DAY`). */
type RealLot = { boughtAt: string; initial: number; amount: number; kg?: number; ripeScore?: number; expiresInDays?: number | null }

// El inventario real se levantó el martes 29 de septiembre de 2026 ("hoy" en la grabación).
// Las fechas de abajo son relativas a ese día, no al día en que se abra la app.
const REAL_DAY = '2026-09-29'
const SUNDAY = '2026-09-27' // "este domingo" en la grabación
const TWO_WEEKS_AGO = '2026-09-15'
const FOUR_DAYS_AGO = '2026-09-25' // pollos despresados / menudencia

/** Primer inventario REAL (28-29 set. 2026), zona por zona: refri, congelador, alacena y frutero.
    Reemplaza los valores inventados para esas zonas. El baño sigue con el placeholder genérico
    (SEED_LEVELS) hasta que levantemos su inventario real también.
    Varias filas tienen más de un lote: son compras distintas de lo mismo (p. ej. dos bolsas de
    cebolla de fechas distintas) y a propósito NO se juntan — cada una mantiene su propio avance. */
const REAL_LOTS: Record<string, RealLot[]> = {
  // --- Congelador ---
  'presas-pollo': [{ boughtAt: FOUR_DAYS_AGO, initial: 25, amount: 25 }],
  menudencia: [{ boughtAt: FOUR_DAYS_AGO, initial: 3, amount: 3 }],
  'carnes-varias': [{ boughtAt: FOUR_DAYS_AGO, initial: 4, amount: 4 }],
  'habas-cong': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],

  // --- Refrigeradora ---
  'arveja-fresca': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  ajo: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  kefir: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  limones: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  leche: [{ boughtAt: REAL_DAY, initial: 2, amount: 2 }], // 2 cartones Gloria de 1 L
  pimenton: [{ boughtAt: REAL_DAY, initial: 1, amount: 0.5 }],
  zapallo: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  culantro: [{ boughtAt: REAL_DAY, initial: 2, amount: 2 }],
  'soya-china': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }], // puntas resecas, pero usable
  repollo: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  coliflor: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  espinaca: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  huacatay: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  tomate: [{ boughtAt: SUNDAY, initial: 8, amount: 8, kg: 1 }],
  zanahoria: [
    { boughtAt: TWO_WEEKS_AGO, initial: 8, amount: 8, expiresInDays: 21 }, // 8 pequeñas; confirmaste que aún son usables aunque pasen los 14 días de regla general
    { boughtAt: SUNDAY, initial: 8, amount: 8, kg: 1 },
  ],
  yogur: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }], // bolsa de yogur griego Gloria
  tortillas: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  kion: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'coco-rallado': [{ boughtAt: REAL_DAY, initial: 100, amount: 20 }],
  'aji-molido': [{ boughtAt: REAL_DAY, initial: 250, amount: 200 }],
  huevos: [{ boughtAt: REAL_DAY, initial: 45, amount: 45 }], // 1.5 planchas de 30
  'cafe-kirma': [{ boughtAt: REAL_DAY, initial: 45, amount: 22.5 }],

  // --- Alacena ---
  arroz: [
    { boughtAt: '2026-09-01', initial: 5000, amount: 1667 }, // costalito Trujillo 5 kg, en uso
    { boughtAt: REAL_DAY, initial: 48000, amount: 48000 }, // costal añejo superior 48 kg, nuevo
  ],
  azucar: [{ boughtAt: '2026-09-05', initial: 48000, amount: 47500 }], // 48 kg asumidos; solo 2 jarras de 250 ml usadas
  'polvo-royal': [{ boughtAt: REAL_DAY, initial: 20, amount: 20 }],
  quinoa: [{ boughtAt: REAL_DAY, initial: 500, amount: 125 }],
  colapez: [{ boughtAt: REAL_DAY, initial: 20, amount: 20 }],
  lenteja: [
    { boughtAt: REAL_DAY, initial: 250, amount: 62.5 },
    { boughtAt: REAL_DAY, initial: 125, amount: 125 }, // bolsa distinta, confirmada
  ],
  'cafe-eco': [{ boughtAt: REAL_DAY, initial: 250, amount: 62.5 }],
  'gelatina-roja': [{ boughtAt: REAL_DAY, initial: 1, amount: 0.125, expiresInDays: -1 }], // "supongo que caducó"
  'gelatina-pina': [{ boughtAt: REAL_DAY, initial: 1, amount: 1, expiresInDays: -899 }], // vence 13/04/2024: ya vencida hace ~2 años y medio
  'gelatina-vainilla': [{ boughtAt: REAL_DAY, initial: 1, amount: 1, expiresInDays: null }], // fecha no encontrada
  'frijoles-blancos': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'cebolla-roja': [
    { boughtAt: TWO_WEEKS_AGO, initial: 6, amount: 5, kg: 1 }, // en uso, ya se usó 1 cebolla
    { boughtAt: SUNDAY, initial: 6, amount: 6, kg: 1 }, // sin abrir
  ],
  'papa-blanca': [{ boughtAt: REAL_DAY, initial: 24, amount: 24, kg: 3 }], // papa grande
  'papa-amarilla': [{ boughtAt: REAL_DAY, initial: 24, amount: 24, kg: 3 }], // papa pequeña
  'papa-huayro': [{ boughtAt: TWO_WEEKS_AGO, initial: 2, amount: 2, kg: 0.25 }], // ojitos morados, brotes pequeños, aún usable
  oyuco: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'hierba-manzanilla': [{ boughtAt: REAL_DAY, initial: 100, amount: 50 }],
  'cebolla-instantanea': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  pasas: [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  manti: [{ boughtAt: REAL_DAY, initial: 90, amount: 88 }], // solo 2 cucharadas usadas
  'canela-molida': [{ boughtAt: REAL_DAY, initial: 50, amount: 45 }],
  atun: [{ boughtAt: REAL_DAY, initial: 3, amount: 3 }],
  'leche-evaporada': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  maicena: [
    { boughtAt: REAL_DAY, initial: 110, amount: 55 },
    { boughtAt: REAL_DAY, initial: 100, amount: 100 },
  ],
  'chocolate-payita': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'chocolate-cusco': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'hierba-luisa': [{ boughtAt: REAL_DAY, initial: 100, amount: 67 }],
  'polvo-universal': [{ boughtAt: REAL_DAY, initial: 25, amount: 23 }],
  'chocolate-macaco': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  garbanzo: [{ boughtAt: REAL_DAY, initial: 125, amount: 125 }],
  frejol: [{ boughtAt: REAL_DAY, initial: 125, amount: 125 }],
  'fideos-codito': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'frijoles-otros': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  harina: [{ boughtAt: REAL_DAY, initial: 1000, amount: 1000 }],
  'harina-sin-marca': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  chuno: [{ boughtAt: REAL_DAY, initial: 250, amount: 250 }],
  'galletas-soda': [{ boughtAt: REAL_DAY, initial: 1, amount: 0.5 }],
  'galletas-vainilla': [{ boughtAt: REAL_DAY, initial: 1, amount: 0.5 }],
  'harina-preparada': [
    { boughtAt: REAL_DAY, initial: 1000, amount: 250 },
    { boughtAt: REAL_DAY, initial: 1000, amount: 1000 },
  ],
  'sal-marina': [{ boughtAt: REAL_DAY, initial: 1000, amount: 950 }],
  sillao: [{ boughtAt: REAL_DAY, initial: 1000, amount: 200 }],
  'vinagre-blanco': [{ boughtAt: REAL_DAY, initial: 1000, amount: 59 }],
  'vinagre-tinto': [{ boughtAt: REAL_DAY, initial: 1000, amount: 333 }],
  oregano: [{ boughtAt: REAL_DAY, initial: 500, amount: 125 }],
  comino: [{ boughtAt: REAL_DAY, initial: 230, amount: 197 }],
  pimienta: [{ boughtAt: REAL_DAY, initial: 212, amount: 85 }],
  ajinomoto: [{ boughtAt: REAL_DAY, initial: 100, amount: 25 }],
  tuco: [{ boughtAt: REAL_DAY, initial: 250, amount: 15 }],
  algarrobina: [{ boughtAt: REAL_DAY, initial: 500, amount: 100 }],
  'esencia-vainilla': [{ boughtAt: REAL_DAY, initial: 100, amount: 100 }],
  croquetas: [{ boughtAt: SUNDAY, initial: 9000, amount: 9000 - 143 * 3 }], // 143 g/día entre las dos gatas × 3 días ya comidos

  // --- Frutero ---
  platanos: [
    { boughtAt: FOUR_DAYS_AGO, initial: 3, amount: 3, ripeScore: RIPENESS.consumir.score }, // maduros, del mostrador
    { boughtAt: SUNDAY, initial: 5, amount: 5, ripeScore: RIPENESS.verde.score }, // mano nueva
  ],
  paltas: [
    { boughtAt: SUNDAY, initial: 7, amount: 7, ripeScore: 1.1 }, // negras
    { boughtAt: SUNDAY, initial: 9, amount: 9, ripeScore: 0.6 }, // verdes (piel de cocodrilo)
  ],
  mandarinas: [{ boughtAt: SUNDAY, initial: 4, amount: 4, kg: 0.5 }], // ½ kg → 4 piezas a 8/kg
  // Naranjas, peras y manzanas: no mencionadas en el inventario real → sin stock (antes tenían un valor inventado).
  naranjas: [],
  peras: [],
  manzanas: [],

  // --- Baño (botiquín queda pendiente, como pediste) ---
  'pasta-dental': [{ boughtAt: REAL_DAY, initial: 150, amount: 150 }], // Colgate triple acción, empaque familiar, sin abrir
  'pasta-dental-dento': [{ boughtAt: REAL_DAY, initial: 180, amount: 45 }], // herbal, usado ¼
  'jabon-ropa-bolivar': [{ boughtAt: REAL_DAY, initial: 250, amount: 175 }], // usado, aún buen tamaño (aprox.)
  alcohol: [{ boughtAt: REAL_DAY, initial: 900, amount: 800 }], // isopropílico Lozano, casi nuevo (aprox.)
  'cepillos-dientes': [{ boughtAt: REAL_DAY, initial: 8, amount: 8 }], // 2 son tuyos, dueños de los otros 6 sin confirmar
  listerine: [{ boughtAt: REAL_DAY, initial: 650, amount: 217 }], // quitamanchas Tax, usado ⅔
  'elvive-oleo': [
    { boughtAt: REAL_DAY, initial: 510, amount: 102 }, // Sábila anticaspa #1, usado ⅘
    { boughtAt: REAL_DAY, initial: 510, amount: 85 }, // Sábila anticaspa #2 (frasco distinto), usado ⅚
  ],
  'fresh-can': [{ boughtAt: REAL_DAY, initial: 300, amount: 225 }], // usado ¼
  'elseve-acond': [{ boughtAt: REAL_DAY, initial: 260, amount: 217 }], // Amaraz sin sal fortalecedor, usado ⅙
  'det-blanco': [{ boughtAt: REAL_DAY, initial: 360, amount: 360 }], // suavizante Bolívar, nuevo
  'escobilla-bano': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
  'escobillas-ropa': [{ boughtAt: REAL_DAY, initial: 2, amount: 2 }],
  'amaraz-reparacion': [{ boughtAt: REAL_DAY, initial: 475, amount: 95 }], // usado ⅘, es de quien levantó el inventario
  'elvive-liso': [{ boughtAt: REAL_DAY, initial: 180, amount: 60 }], // Head & Shoulders anticomezón, usado ⅔
  'palmolive-ducha': [{ boughtAt: REAL_DAY, initial: 650, amount: 130 }], // Head & Shoulders cafeína, queda ⅕
  dove: [{ boughtAt: REAL_DAY, initial: 500, amount: 444 }], // body exfoliante Goji Berry, quedan 8/9
  medicasp: [{ boughtAt: REAL_DAY, initial: 130, amount: 104 }], // quedan ⅘
  johnsons: [{ boughtAt: REAL_DAY, initial: 5000, amount: 556 }], // perfumador ambiental, queda 1/9 (capacidad del galón aproximada)
  'palmolive-aloe': [{ boughtAt: REAL_DAY, initial: 5000, amount: 455 }], // lejía Clorina, queda 1/11 (aproximada)
  'jabon-manos': [{ boughtAt: REAL_DAY, initial: 500, amount: 500 }], // jabón líquido, lleno
  guantes: [{ boughtAt: REAL_DAY, initial: 2, amount: 2 }], // 2 guantes azules
  'amaraz-andina': [{ boughtAt: REAL_DAY, initial: 260, amount: 43 }], // Magia Andina sin sal, queda ⅙
  nutribella: [{ boughtAt: REAL_DAY, initial: 400, amount: 333 }], // bioqueratina, quedan ⅚
  'jabon-moncler': [{ boughtAt: REAL_DAY, initial: 150, amount: 50 }], // familiar ×2, queda ⅓ de lo que tenía antes (aprox.)
  patito: [{ boughtAt: REAL_DAY, initial: 1000, amount: 800 }], // detergente en pasta, quedan ⅘
  'toallas-blancas': [{ boughtAt: REAL_DAY, initial: 4, amount: 4 }],
  'toallas-color': [{ boughtAt: REAL_DAY, initial: 4, amount: 4 }], // rosada, estampada de gato, morada y verde
  'bata-azul': [{ boughtAt: REAL_DAY, initial: 1, amount: 1 }],
}

const SEED_LEVELS: Record<string, number> = {
  huevos: 60, leche: 35, yogur: 70, queso: 60, mantequilla: 80, jugo: 25, guiso: 50, verdes: 65, rojas: 55,
  harina: 70, menestras: 85, atun: 40, latas: 75, papas: 45, cebollas: 22, arroz: 80, azucar: 55,
}

/** Primer inventario: cantidades aproximadas para arrancar (las corrige quien revise "queda ½", "queda ¼"...). */
const SEED_AMOUNTS: Record<string, number> = { platanos: 5, paltas: 3.5, naranjas: 2, peras: 1, manzanas: 1, 'arvejas-cong': 3, 'taper-arvejas': 2 }
const SEED_RIPE: Record<string, number> = { platanos: 2.3, paltas: 1.4, naranjas: 1.3, peras: 0.4, manzanas: 0.5 }

/** Vencimiento de un lote real: el override explícito si lo hay (`null` = sin fecha), si no la regla del artículo. */
function realExpiry(article: Article, boughtAt: string, override?: number | null): string | null {
  if (override !== undefined) return override === null ? null : addDays(boughtAt, override)
  return article.expiry.kind === 'date' ? addDays(boughtAt, article.expiry.days) : null
}

function realLotsFor(article: Article, entries: RealLot[]): Lot[] {
  return entries.map((entry, index) => ({
    id: `real-${article.id}-${index}`,
    articleId: article.id,
    boughtAt: entry.boughtAt,
    initial: entry.initial,
    amount: entry.amount,
    checkedAt: REAL_DAY,
    checks: entry.amount < entry.initial ? [{ at: entry.boughtAt, amount: entry.initial }, { at: REAL_DAY, amount: entry.amount }] : [{ at: entry.boughtAt, amount: entry.initial }],
    expiresAt: realExpiry(article, entry.boughtAt, entry.expiresInDays),
    openedAt: entry.amount < entry.initial ? entry.boughtAt : null,
    closedAt: null,
    kg: entry.kg ?? null,
    by: 'Inicio',
    deletedAt: null,
    ripe: entry.ripeScore !== undefined ? { score: entry.ripeScore, at: entry.boughtAt } : article.ripenDays ? { score: RIPENESS.punto.score, at: entry.boughtAt } : null,
  }))
}

export function seedLots(today: string): Lot[] {
  return articles.filter((article) => !article.custom).flatMap((article) => {
    // El inventario real (refri, congelador, alacena, frutero) ya reemplazó los valores inventados.
    // El baño sigue con el placeholder genérico hasta que levantemos su inventario real también.
    const real = REAL_LOTS[article.id]
    if (real) return realLotsFor(article, real)

    const isKibble = article.id === 'croquetas'
    const boughtAt = isKibble ? (daysBetween('2026-09-08', today) >= 0 ? '2026-09-08' : today) : today
    const par = parOf(article)
    const raw = par * ((SEED_LEVELS[article.shelfId] ?? 50) / 100)
    const amount = SEED_AMOUNTS[article.id] ?? (isKibble ? par : article.tracking === 'measure' ? Math.max(100, Math.round(raw / 100) * 100) : Math.max(0.5, Math.round(raw * 2) / 2))
    return [
      {
        id: `seed-${article.id}`,
        articleId: article.id,
        boughtAt,
        initial: amount,
        amount,
        checkedAt: boughtAt,
        checks: [{ at: boughtAt, amount }],
        expiresAt: null,
        openedAt: null,
        closedAt: null,
        kg: null,
        by: 'Inicio',
        deletedAt: null,
        ripe: article.ripenDays ? { score: SEED_RIPE[article.id] ?? 1.5, at: today } : null,
      },
    ]
  })
}

export { formatGrams }

/** Convierte movimientos recién hechos en entradas del historial (para verlas al instante, antes de que lleguen del servidor). */
export function toHistory(movements: Movement[], by: string, now = new Date()): HistoryEntry[] {
  const at = now.toISOString()
  return movements.map((movement, index) => ({ ...movement, id: `local-${now.getTime()}-${index}-${movement.lotId}`, at, by }))
}
