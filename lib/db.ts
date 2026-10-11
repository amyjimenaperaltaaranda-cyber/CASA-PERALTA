import { ensureSession } from './auth'
import { firebaseConfigured, getFirebaseApp } from './firebase'
import type { Article } from './catalog'
import type { Hamper } from './hampers'
import type { HistoryEntry, Lot, Movement, MovementKind } from './lots'

/* Capa de Firestore. Colecciones:
   - lots/{lotId}              → cada compra es un lote: cantidad, vencimiento y observaciones (base del aprendizaje)
   - movements/{auto}          → historial unificado (crear / editar / borrar / uso / revisión / canastas), con quién y cuándo.
                                 Solo se agrega: nunca se edita ni se borra.
   (Los lotes tampoco se borran: `deletedAt` los oculta y se pueden restaurar.)
   - products/{id}             → productos nuevos creados por la familia (con sus reglas ya copiadas); `deletedAt` = archivado
   - hampers/{id}              → nivel de llenura de cada canasta de ropa sucia (mama, nosotras, hermanos)
   - petTracker/{YYYY-MM-DD}   → { entries: { "Gata:Turno": { by, at } } }, un documento por día
   (users/ guarda los PIN.) */

export type FeedingEntry = { by: string; at: string }
export type RemoteFeeding = Record<string, FeedingEntry>
type OnError = (error: unknown) => void

const TZ = 'America/Lima'

/** Día en hora de Lima (YYYY-MM-DD): las casillas de las gatas se reinician cuando cambia. */
export const dayKey = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: TZ })

/** Milisegundos hasta la próxima medianoche de Lima. */
export function msUntilMidnight(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? 0)
  return (86400 - (part('hour') * 3600 + part('minute') * 60 + part('second'))) * 1000 + 500
}

async function connect() {
  await ensureSession()
  const fs = await import('firebase/firestore')
  return { fs, db: fs.getFirestore(getFirebaseApp()) }
}

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)
const str = (value: unknown) => (typeof value === 'string' ? value : null)

function parseLot(id: string, data: Record<string, unknown>): Lot | null {
  const articleId = str(data.articleId)
  const boughtAt = str(data.boughtAt)
  const initial = num(data.initial)
  const amount = num(data.amount)
  if (!articleId || !boughtAt || initial === null || amount === null) return null
  const checks = Array.isArray(data.checks)
    ? data.checks.flatMap((entry) => {
        const at = str((entry as Record<string, unknown>)?.at)
        const value = num((entry as Record<string, unknown>)?.amount)
        return at && value !== null ? [{ at, amount: value }] : []
      })
    : []
  return {
    id,
    articleId,
    boughtAt,
    initial,
    amount,
    checkedAt: str(data.checkedAt) ?? boughtAt,
    checks: checks.length ? checks : [{ at: boughtAt, amount: initial }],
    expiresAt: str(data.expiresAt),
    openedAt: str(data.openedAt),
    closedAt: str(data.closedAt),
    kg: num(data.kg),
    by: str(data.by) ?? '',
    deletedAt: str(data.deletedAt),
    ripe: parseRipe(data.ripe),
  }
}

function parseRipe(value: unknown): Lot['ripe'] {
  const data = value as Record<string, unknown> | null
  const score = num(data?.score)
  const at = str(data?.at)
  return score !== null && at ? { score, at } : null
}

/** Escucha los lotes en vivo. Si la colección está vacía, la siembra con `seed`. */
export function subscribeLots(seed: Lot[], onData: (lots: Lot[]) => void, onError: OnError): () => void {
  if (!firebaseConfigured) return () => {}
  let cancelled = false
  let unsubscribe = () => {}
  let seeding = false
  let toppedUp = false

  connect()
    .then(({ fs, db }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.collection(db, 'lots'),
        (snapshot) => {
          if (snapshot.empty) {
            // Una caché vacía no significa que el servidor esté vacío: solo sembramos con datos del servidor.
            if (snapshot.metadata.fromCache || seeding) return
            seeding = true
            const batch = fs.writeBatch(db)
            for (const lot of seed) batch.set(fs.doc(db, 'lots', lot.id), { ...lot, updatedAt: fs.serverTimestamp() })
            batch.commit().catch(onError)
            return
          }
          const lots: Lot[] = []
          snapshot.forEach((entry) => {
            const lot = parseLot(entry.id, entry.data())
            if (lot) lots.push(lot)
          })
          // Insumos nuevos del catálogo (p. ej. el baño) que aún no tienen ningún lote: se siembran una sola vez.
          if (!snapshot.metadata.fromCache && !toppedUp) {
            const missing = seed.filter((lot) => !lots.some((entry) => entry.articleId === lot.articleId))
            if (missing.length) {
              toppedUp = true
              const batch = fs.writeBatch(db)
              for (const lot of missing) batch.set(fs.doc(db, 'lots', lot.id), { ...lot, updatedAt: fs.serverTimestamp() })
              batch.commit().catch(onError)
            }
          }
          onData(lots)
        },
        onError,
      )
    })
    .catch(onError)

  return () => {
    cancelled = true
    unsubscribe()
  }
}

/** Guarda los lotes que cambiaron y deja constancia de cada movimiento. */
export async function saveLots(changed: Lot[], movements: Movement[], by: string) {
  if (changed.length === 0) return
  const { fs, db } = await connect()
  const batch = fs.writeBatch(db)
  for (const lot of changed) batch.set(fs.doc(db, 'lots', lot.id), { ...lot, updatedAt: fs.serverTimestamp(), updatedBy: by })
  for (const movement of movements) batch.set(fs.doc(fs.collection(db, 'movements')), movementDoc(fs, movement, by))
  await batch.commit()
}

function movementDoc(fs: typeof import('firebase/firestore'), movement: Movement, by: string) {
  // Firestore no acepta `undefined`: el detalle solo se guarda si existe.
  return { articleId: movement.articleId, lotId: movement.lotId, kind: movement.kind, amount: movement.amount, ...(movement.detail ? { detail: movement.detail } : {}), by, at: fs.serverTimestamp(), day: dayKey() }
}

/** Registra movimientos que no cambian lotes (p. ej. las canastas de ropa sucia). */
export async function saveMovements(movements: Movement[], by: string) {
  if (movements.length === 0) return
  const { fs, db } = await connect()
  const batch = fs.writeBatch(db)
  for (const movement of movements) batch.set(fs.doc(fs.collection(db, 'movements')), movementDoc(fs, movement, by))
  await batch.commit()
}

const KINDS: MovementKind[] = ['create', 'buy', 'use', 'check', 'finish', 'edit', 'delete', 'restore', 'hamper']

/** Escucha en vivo los últimos movimientos (el historial unificado). */
export function subscribeHistory(onData: (entries: HistoryEntry[]) => void, onError: OnError, max = 200): () => void {
  if (!firebaseConfigured) return () => {}
  let cancelled = false
  let unsubscribe = () => {}

  connect()
    .then(({ fs, db }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.query(fs.collection(db, 'movements'), fs.orderBy('at', 'desc'), fs.limit(max)),
        (snapshot) => {
          const entries: HistoryEntry[] = []
          snapshot.forEach((entry) => {
            const data = entry.data()
            const kind = KINDS.find((value) => value === data.kind)
            const articleId = str(data.articleId)
            if (!kind || !articleId) return
            const at = typeof data.at?.toDate === 'function' ? (data.at.toDate() as Date).toISOString() : new Date().toISOString()
            entries.push({ id: entry.id, articleId, lotId: str(data.lotId) ?? '', kind, amount: num(data.amount) ?? 0, detail: str(data.detail) ?? undefined, by: str(data.by) ?? '', at })
          })
          onData(entries)
        },
        onError,
      )
    })
    .catch(onError)

  return () => {
    cancelled = true
    unsubscribe()
  }
}

/** Escucha en vivo las comidas marcadas para el día `day`. */
export function subscribeFeeding(day: string, onData: (feeding: RemoteFeeding) => void, onError: OnError): () => void {
  if (!firebaseConfigured) return () => {}
  let cancelled = false
  let unsubscribe = () => {}

  connect()
    .then(({ fs, db }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.doc(db, 'petTracker', day),
        (snapshot) => onData((snapshot.exists() ? snapshot.data().entries : null) ?? {}),
        onError,
      )
    })
    .catch(onError)

  return () => {
    cancelled = true
    unsubscribe()
  }
}

/** Marca (`entry`) o desmarca (`null`) una comida de las gatas en el día `day`. */
export async function saveFeeding(day: string, key: string, entry: FeedingEntry | null) {
  const { fs, db } = await connect()
  await fs.setDoc(
    fs.doc(db, 'petTracker', day),
    { entries: { [key]: entry ?? fs.deleteField() }, updatedAt: fs.serverTimestamp() },
    { merge: true },
  )
}

function parseHamper(id: string, data: Record<string, unknown>): Hamper | null {
  const level = num(data.level)
  if (level === null) return null
  const updatedAt = str(data.updatedAt) ?? ''
  return {
    id,
    level,
    updatedAt,
    emptiedAt: str(data.emptiedAt) ?? updatedAt,
    cycles: Array.isArray(data.cycles) ? data.cycles.filter((value): value is number => typeof value === 'number') : [],
    by: str(data.by) ?? '',
  }
}

/** Escucha en vivo las canastas de ropa sucia. Las que falten se siembran con `seed`. */
export function subscribeHampers(seed: Hamper[], onData: (hampers: Hamper[]) => void, onError: OnError): () => void {
  if (!firebaseConfigured) return () => {}
  let cancelled = false
  let unsubscribe = () => {}
  let seeding = false

  connect()
    .then(({ fs, db }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.collection(db, 'hampers'),
        (snapshot) => {
          const found: Hamper[] = []
          snapshot.forEach((entry) => {
            const hamper = parseHamper(entry.id, entry.data())
            if (hamper) found.push(hamper)
          })
          const missing = seed.filter((entry) => !found.some((hamper) => hamper.id === entry.id))
          if (missing.length && !snapshot.metadata.fromCache && !seeding) {
            seeding = true
            const batch = fs.writeBatch(db)
            for (const hamper of missing) batch.set(fs.doc(db, 'hampers', hamper.id), { ...hamper, updatedAtServer: fs.serverTimestamp() })
            batch.commit().catch(onError)
          }
          onData([...found, ...missing].sort((a, b) => seed.findIndex((x) => x.id === a.id) - seed.findIndex((x) => x.id === b.id)))
        },
        onError,
      )
    })
    .catch(onError)

  return () => {
    cancelled = true
    unsubscribe()
  }
}

export async function saveHamper(hamper: Hamper, by: string) {
  const { fs, db } = await connect()
  await fs.setDoc(fs.doc(db, 'hampers', hamper.id), { ...hamper, updatedBy: by, updatedAtServer: fs.serverTimestamp() })
}

/* ------------------------------ productos nuevos ------------------------------ */

const TRACKING = ['units', 'measure']

function parseProduct(id: string, data: Record<string, unknown>): Article | null {
  const name = str(data.name)
  const shelfId = str(data.shelfId)
  const unit = data.unit
  if (!name || !shelfId || !Array.isArray(unit) || unit.length !== 2 || typeof data.tracking !== 'string' || !TRACKING.includes(data.tracking)) return null
  const expiry = data.expiry as { kind?: string; days?: number } | undefined
  return {
    ...(JSON.parse(JSON.stringify(data)) as Partial<Article>),
    id,
    name,
    shelfId,
    tracking: data.tracking as Article['tracking'],
    unit: [String(unit[0]), String(unit[1])],
    buy: Array.isArray(data.buy) ? (data.buy as Article['buy']) : [],
    use: Array.isArray(data.use) ? (data.use as Article['use']) : [],
    expiry: expiry?.kind === 'date' || expiry?.kind === 'shelf' ? { kind: expiry.kind, days: Number(expiry.days) || 0 } : { kind: 'none' },
    custom: true,
    deletedAt: str(data.deletedAt),
  }
}

/** Escucha en vivo los productos nuevos (vivos y archivados). */
export function subscribeProducts(onData: (products: Article[]) => void, onError: OnError): () => void {
  if (!firebaseConfigured) return () => {}
  let cancelled = false
  let unsubscribe = () => {}
  connect()
    .then(({ fs, db }) => {
      if (cancelled) return
      unsubscribe = fs.onSnapshot(
        fs.collection(db, 'products'),
        (snapshot) => {
          const products: Article[] = []
          snapshot.forEach((entry) => {
            const product = parseProduct(entry.id, entry.data())
            if (product) products.push(product)
          })
          onData(products)
        },
        onError,
      )
    })
    .catch(onError)
  return () => {
    cancelled = true
    unsubscribe()
  }
}

/** Guarda en un solo lote productos, lotes y movimientos de un mismo cambio. */
export async function saveCatalogChange(change: { products: Article[]; lots: Lot[]; movements: Movement[] }, by: string) {
  if (change.products.length + change.lots.length + change.movements.length === 0) return
  const { fs, db } = await connect()
  const batch = fs.writeBatch(db)
  for (const product of change.products) batch.set(fs.doc(db, 'products', product.id), { ...JSON.parse(JSON.stringify(product)), updatedBy: by, updatedAtServer: fs.serverTimestamp() })
  for (const lot of change.lots) batch.set(fs.doc(db, 'lots', lot.id), { ...lot, updatedAt: fs.serverTimestamp() })
  for (const movement of change.movements) batch.set(fs.doc(fs.collection(db, 'movements')), movementDoc(fs, movement, by))
  await batch.commit()
}
