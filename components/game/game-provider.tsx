'use client'

import { createContext, type Dispatch, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { ensureSession } from '@/lib/auth'
import { dayKey, msUntilMidnight, type RemoteFeeding, saveCatalogChange, saveFeeding, saveHamper, saveLots, saveMovements, subscribeFeeding, subscribeHampers, subscribeHistory, subscribeLots, subscribeProducts } from '@/lib/db'
import { firebaseConfigured } from '@/lib/firebase'
import { type FamilyMember, feedingKey } from '@/lib/inventory'
import { type Article, syncCustomArticles } from '@/lib/catalog'
import { applyProductAction, isProductAction, type ProductAction } from '@/lib/products'
import { applyHamper, type Hamper, type HamperAction, seedHampers } from '@/lib/hampers'
import { applyLoan, type Loan, type LoanAction, seedLoans } from '@/lib/loans'
import { applyLotAction, type HistoryEntry, isLotAction, type Lot, type LotAction, seedLots, toHistory } from '@/lib/lots'
import { mainOf, type View, type ZoomView } from '@/lib/scene'

type FeedingEntry = { by: string; at: string }

type GameState = {
  view: View
  lastZoom: ZoomView | null
  player: FamilyMember | null
  /** Todos los lotes (compras) con su cantidad, vencimiento y observaciones. */
  lots: Lot[]
  /** Productos nuevos creados por la familia (vivos) y los archivados (borrado suave). */
  products: Article[]
  archivedProducts: Article[]
  /** Ventana "Nuevo producto": abierta con un mueble o un nombre sugeridos. */
  newProduct: { shelfId?: string; name?: string } | null
  /** Lotes borrados (borrado suave): siguen guardados y se pueden restaurar. */
  trash: Lot[]
  /** Historial unificado de movimientos (lo más reciente primero). */
  history: HistoryEntry[]
  /** Canastas de ropa sucia y su nivel de llenura. */
  hampers: Hamper[]
  /** Objetos que se prestan y vuelven (por ahora, los paraguas). Solo local: no se sincroniza con Firebase todavía. */
  loans: Loan[]
  /** Día actual en hora de Lima (YYYY-MM-DD); cambia a medianoche. */
  today: string
  feeding: Record<string, FeedingEntry>
  toast: { id: number; message: string } | null
}

type GameAction =
  | { type: 'login'; member: FamilyMember }
  | { type: 'logout' }
  | { type: 'zoom'; view: ZoomView }
  | { type: 'back' }
  | { type: 'goto'; view: 'main_kitchen' | 'main_bathroom' }
  | LotAction
  | HamperAction
  | LoanAction
  | ProductAction
  | { type: 'openNewProduct'; shelfId?: string; name?: string }
  | { type: 'closeNewProduct' }
  | { type: 'hydrateProducts'; products: Article[] }
  | { type: 'hydrateHampers'; hampers: Hamper[] }
  | { type: 'feed'; key: string; at: string }
  | { type: 'hydrateLots'; lots: Lot[] }
  | { type: 'hydrateHistory'; history: HistoryEntry[] }
  | { type: 'hydrateFeeding'; feeding: RemoteFeeding }
  | { type: 'setDay'; today: string }
  | { type: 'toast'; message: string }
  | { type: 'dismissToast'; id: number }

const initialState: GameState = {
  view: 'login',
  lastZoom: null,
  player: null,
  lots: [],
  products: [],
  archivedProducts: [],
  newProduct: null,
  trash: [],
  history: [],
  hampers: [],
  loans: seedLoans(),
  today: '',
  feeding: { [feedingKey('Monchi', 'Mañana')]: { by: 'Jorge', at: '07:30' } },
  toast: null,
}

const withToast = (state: GameState, message: string) => ({ id: (state.toast?.id ?? 0) + 1, message })
const actor = (state: GameState) => state.player?.name ?? 'Alguien'

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'login':
      return { ...state, player: action.member, view: 'main_kitchen', lastZoom: null }
    case 'logout':
      return { ...state, view: 'login', lastZoom: null }
    case 'zoom':
      return { ...state, view: action.view, lastZoom: action.view }
    case 'back':
      // Del congelador se vuelve al interior de la refrigeradora.
      return state.view === 'zoomed_freezer' ? { ...state, view: 'zoomed_fridge', lastZoom: 'zoomed_fridge' } : { ...state, view: mainOf(state.view) }
    case 'goto':
      return { ...state, view: action.view, lastZoom: null }
    case 'buy':
    case 'use':
    case 'check':
    case 'finish':
    case 'discard':
    case 'edit':
    case 'delete':
    case 'restore':
    case 'ripe': {
      const outcome = applyLotAction(state.lots, action, { today: state.today, by: actor(state), trash: state.trash })
      const changedIds = new Set(outcome.changed.map((lot) => lot.id))
      const trash = [...state.trash.filter((lot) => !changedIds.has(lot.id)), ...outcome.changed.filter((lot) => lot.deletedAt !== null)]
      return {
        ...state,
        lots: outcome.lots,
        trash,
        history: [...toHistory(outcome.movements, actor(state)), ...state.history].slice(0, 300),
        toast: outcome.message ? withToast(state, outcome.message) : state.toast,
      }
    }
    case 'newProduct':
    case 'editProduct':
    case 'archiveProduct':
    case 'restoreProduct': {
      const outcome = applyProductAction(state.products, state.archivedProducts, state.lots, action, { today: state.today, by: actor(state) })
      const bought = new Set(outcome.changedLots.map((lot) => lot.id))
      return {
        ...state,
        products: outcome.products,
        archivedProducts: outcome.archived,
        lots: outcome.lots,
        trash: state.trash.filter((lot) => !bought.has(lot.id)),
        newProduct: action.type === 'newProduct' && outcome.changedProducts.length > 0 ? null : state.newProduct,
        history: [...toHistory(outcome.movements, actor(state)), ...state.history].slice(0, 300),
        toast: outcome.message ? withToast(state, outcome.message) : state.toast,
      }
    }
    case 'openNewProduct':
      return { ...state, newProduct: { shelfId: action.shelfId, name: action.name } }
    case 'closeNewProduct':
      return { ...state, newProduct: null }
    case 'hydrateProducts': {
      const live = action.products.filter((product) => !product.deletedAt)
      const archived = action.products.filter((product) => product.deletedAt)
      syncCustomArticles(live, archived)
      return { ...state, products: live, archivedProducts: archived }
    }
    case 'hamper': {
      const outcome = applyHamper(state.hampers, action, { today: state.today, by: actor(state) })
      return {
        ...state,
        hampers: outcome.hampers,
        history: [...toHistory(outcome.movements, actor(state)), ...state.history].slice(0, 300),
        toast: outcome.message ? withToast(state, outcome.message) : state.toast,
      }
    }
    case 'loan': {
      const outcome = applyLoan(state.loans, action, { today: state.today, by: actor(state) })
      return {
        ...state,
        loans: outcome.loans,
        history: outcome.movements.length ? [...toHistory(outcome.movements, actor(state)), ...state.history].slice(0, 300) : state.history,
        toast: outcome.message ? withToast(state, outcome.message) : state.toast,
      }
    }
    case 'hydrateHampers':
      return { ...state, hampers: action.hampers }
    case 'feed': {
      const feeding = { ...state.feeding }
      if (feeding[action.key]) delete feeding[action.key]
      else feeding[action.key] = { by: actor(state), at: action.at }
      return { ...state, feeding }
    }
    case 'hydrateLots':
      // Los lotes borrados llegan del servidor con `deletedAt`: van a la papelera, no desaparecen.
      return { ...state, lots: action.lots.filter((lot) => lot.deletedAt === null), trash: action.lots.filter((lot) => lot.deletedAt !== null) }
    case 'hydrateHistory':
      return { ...state, history: action.history }
    case 'hydrateFeeding':
      return { ...state, feeding: action.feeding }
    case 'setDay':
      return state.today === action.today ? state : { ...state, today: action.today }
    case 'toast':
      return { ...state, toast: withToast(state, action.message) }
    case 'dismissToast':
      return state.toast?.id === action.id ? { ...state, toast: null } : state
  }
}

const GameContext = createContext<{ state: GameState; dispatch: Dispatch<GameAction> } | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, initialState, (initial) => {
    const today = dayKey()
    return { ...initial, today, lots: seedLots(today), hampers: seedHampers(today), loans: seedLoans() }
  })
  const stateRef = useRef(state)
  stateRef.current = state
  const errorShown = useRef(false)
  const loggedIn = state.view !== 'login'

  const reportError = useCallback(() => {
    if (errorShown.current) return
    errorShown.current = true
    rawDispatch({ type: 'toast', message: 'No se pudo sincronizar con Firebase. Revisa tu conexión.' })
  }, [])

  // Cada cambio se aplica al instante en pantalla y, si Firebase está configurado, también se guarda.
  const dispatch = useCallback<Dispatch<GameAction>>(
    (action) => {
      rawDispatch(action)
      if (!firebaseConfigured) return
      const current = stateRef.current
      const by = actor(current)
      if (isProductAction(action)) {
        const outcome = applyProductAction(current.products, current.archivedProducts, current.lots, action, { today: current.today, by })
        saveCatalogChange({ products: outcome.changedProducts, lots: outcome.changedLots, movements: outcome.movements }, by).catch(reportError)
      } else if (isLotAction(action)) {
        const outcome = applyLotAction(current.lots, action, { today: current.today, by, trash: current.trash })
        saveLots(outcome.changed, outcome.movements, by).catch(reportError)
      } else if (action.type === 'hamper') {
        const outcome = applyHamper(current.hampers, action, { today: current.today, by })
        if (outcome.changed) saveHamper(outcome.changed, by).catch(reportError)
        saveMovements(outcome.movements, by).catch(reportError)
      } else if (action.type === 'feed') {
        const done = !!current.feeding[action.key]
        saveFeeding(dayKey(), action.key, done ? null : { by, at: action.at }).catch(reportError)
      }
    },
    [reportError],
  )

  // Abre la sesión anónima desde el inicio: el login por PIN necesita leer Firestore.
  useEffect(() => {
    ensureSession().catch(() => {})
  }, [])

  // Lotes en vivo (una vez dentro de la cocina).
  useEffect(() => {
    if (!loggedIn) return
    return subscribeLots(seedLots(stateRef.current.today), (lots) => rawDispatch({ type: 'hydrateLots', lots }), reportError)
  }, [loggedIn, reportError])

  // Productos nuevos en vivo.
  useEffect(() => {
    if (!loggedIn) return
    return subscribeProducts((products) => rawDispatch({ type: 'hydrateProducts', products }), reportError)
  }, [loggedIn, reportError])

  // Historial unificado en vivo.
  useEffect(() => {
    if (!loggedIn) return
    return subscribeHistory((history) => rawDispatch({ type: 'hydrateHistory', history }), reportError)
  }, [loggedIn, reportError])

  // Canastas de ropa sucia en vivo.
  useEffect(() => {
    if (!loggedIn) return
    return subscribeHampers(seedHampers(stateRef.current.today), (hampers) => rawDispatch({ type: 'hydrateHampers', hampers }), reportError)
  }, [loggedIn, reportError])

  // Comidas de las gatas del día en vivo.
  useEffect(() => {
    if (!loggedIn) return
    return subscribeFeeding(state.today, (feeding) => rawDispatch({ type: 'hydrateFeeding', feeding }), reportError)
  }, [loggedIn, state.today, reportError])

  // Cambio de día a medianoche (hora de Lima): reinicia las casillas y recalcula lo que depende de la fecha.
  useEffect(() => {
    const refresh = () => rawDispatch({ type: 'setDay', today: dayKey() })
    let timer = setTimeout(function tick() {
      refresh()
      timer = setTimeout(tick, msUntilMidnight())
    }, msUntilMidnight())
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch])
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside <GameProvider>')
  return context
}
