import { type Article, articleById, articles, shelves, syncCustomArticles } from './catalog'
import { applyLotAction, type Lot, type LotAction, type Movement } from './lots'

/* Productos creados por el usuario: crear, editar (nombre / mueble) y archivar con borrado suave.
   Nada se elimina: un producto archivado sigue guardado y se restaura desde el historial. */

export type ProductAction =
  | { type: 'newProduct'; article: Article; purchase?: Extract<LotAction, { type: 'buy' }> }
  | { type: 'editProduct'; id: string; patch: { name?: string; shelfId?: string } }
  | { type: 'archiveProduct'; id: string }
  | { type: 'restoreProduct'; id: string }

export const isProductAction = (action: { type: string }): action is ProductAction => ['newProduct', 'editProduct', 'archiveProduct', 'restoreProduct'].includes(action.type)

export type ProductOutcome = {
  products: Article[]
  archived: Article[]
  lots: Lot[]
  changedProducts: Article[]
  changedLots: Lot[]
  movements: Movement[]
  message: string
}

const norm = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const shelfName = (id: string) => shelves.find((shelf) => shelf.id === id)?.name ?? id

export function applyProductAction(products: Article[], archived: Article[], lots: Lot[], action: ProductAction, ctx: { today: string; by: string; trash?: Lot[] }): ProductOutcome {
  const same: ProductOutcome = { products, archived, lots, changedProducts: [], changedLots: [], movements: [], message: '' }

  if (action.type === 'newProduct') {
    const name = action.article.name.trim()
    if (!name || !shelves.some((shelf) => shelf.id === action.article.shelfId)) return same
    if (articles.some((entry) => norm(entry.name) === norm(name))) return { ...same, message: `Ya existe “${name}”: búscalo en su mueble` }
    const article: Article = { ...action.article, name, custom: true, createdBy: ctx.by, createdAt: ctx.today, deletedAt: null }
    const nextProducts = [...products, article]
    syncCustomArticles(nextProducts, archived)
    const movements: Movement[] = [{ articleId: article.id, lotId: '', kind: 'create', amount: 0, detail: `Producto nuevo: ${name} · ${shelfName(article.shelfId)}` }]
    let nextLots = lots
    let changedLots: Lot[] = []
    if (action.purchase) {
      const bought = applyLotAction(lots, { ...action.purchase, articleId: article.id }, ctx)
      nextLots = bought.lots
      changedLots = bought.changed
      movements.push(...bought.movements)
    }
    return { products: nextProducts, archived, lots: nextLots, changedProducts: [article], changedLots, movements, message: `${name} agregado a ${shelfName(article.shelfId)}` }
  }

  if (action.type === 'editProduct') {
    const current = products.find((entry) => entry.id === action.id)
    if (!current) return same
    const name = action.patch.name?.trim() || current.name
    const shelfId = action.patch.shelfId && shelves.some((shelf) => shelf.id === action.patch.shelfId) ? action.patch.shelfId : current.shelfId
    if (name === current.name && shelfId === current.shelfId) return same
    if (name !== current.name && articles.some((entry) => entry.id !== current.id && norm(entry.name) === norm(name))) return { ...same, message: `Ya existe “${name}”` }
    const detail: string[] = []
    if (name !== current.name) detail.push(`Nombre: ${current.name} → ${name}`)
    if (shelfId !== current.shelfId) detail.push(`Mueble: ${shelfName(current.shelfId)} → ${shelfName(shelfId)}`)
    const edited: Article = { ...current, name, shelfId }
    const nextProducts = products.map((entry) => (entry.id === edited.id ? edited : entry))
    syncCustomArticles(nextProducts, archived)
    return { ...same, products: nextProducts, changedProducts: [edited], movements: [{ articleId: edited.id, lotId: '', kind: 'edit', amount: 0, detail: `Producto · ${detail.join(' · ')}` }], message: `${name}: producto actualizado` }
  }

  if (action.type === 'archiveProduct') {
    const current = products.find((entry) => entry.id === action.id)
    if (!current) return same
    const gone: Article = { ...current, deletedAt: ctx.today }
    const nextProducts = products.filter((entry) => entry.id !== current.id)
    const nextArchived = [...archived, gone]
    syncCustomArticles(nextProducts, nextArchived)
    return { ...same, products: nextProducts, archived: nextArchived, changedProducts: [gone], movements: [{ articleId: current.id, lotId: '', kind: 'delete', amount: 0, detail: `Producto quitado: ${current.name} · sus lotes se conservan y se puede restaurar` }], message: `${current.name}: producto quitado · se puede restaurar desde el historial` }
  }

  const back = archived.find((entry) => entry.id === action.id)
  if (!back || articleById(back.id)) return same
  const restored: Article = { ...back, deletedAt: null }
  const nextProducts = [...products, restored]
  const nextArchived = archived.filter((entry) => entry.id !== back.id)
  syncCustomArticles(nextProducts, nextArchived)
  return { ...same, products: nextProducts, archived: nextArchived, changedProducts: [restored], movements: [{ articleId: back.id, lotId: '', kind: 'restore', amount: 0, detail: `Producto restaurado: ${back.name}` }], message: `${back.name}: producto restaurado` }
}
