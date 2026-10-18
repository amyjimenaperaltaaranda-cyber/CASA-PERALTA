import type { Movement } from './lots'

/* Objetos que se prestan y vuelven, no se consumen: por ahora, los paraguas.
   No llevan barra de vida ni vencimiento — solo importa quién lo tiene ahora,
   para saber en temporada de lluvia si alguien ya salió con uno. */

export type LoanableDef = { id: string; name: string }

export const loanableDefs: LoanableDef[] = [
  { id: 'paraguas-plegable', name: 'Paraguas amarillo plegable' },
  { id: 'paraguas-azul', name: 'Paraguas azul' },
  { id: 'paraguas-morado', name: 'Paraguas morado' },
  { id: 'paraguas-rayas', name: 'Paraguas azul con rayas blancas' },
]
export const loanableDef = (id: string) => loanableDefs.find((entry) => entry.id === id)

export type Loan = {
  id: string
  status: 'home' | 'out'
  takenBy: string | null
  takenAt: string | null
  returnedBy: string | null
  returnedAt: string | null
}

export type LoanAction = { type: 'loan'; id: string; action: 'take' | 'return' }
export type LoanOutcome = { loans: Loan[]; changed: Loan | null; message: string; movements: Movement[] }

export function applyLoan(loans: Loan[], action: LoanAction, ctx: { today: string; by: string }): LoanOutcome {
  const current = loans.find((entry) => entry.id === action.id)
  const def = loanableDef(action.id)
  if (!current || !def) return { loans, changed: null, message: '', movements: [] }

  if (action.action === 'take') {
    if (current.status === 'out') return { loans, changed: null, message: `${def.name}: ya está afuera, se lo llevó ${current.takenBy}`, movements: [] }
    const next: Loan = { ...current, status: 'out', takenBy: ctx.by, takenAt: ctx.today, returnedBy: null, returnedAt: null }
    return {
      loans: loans.map((entry) => (entry.id === next.id ? next : entry)),
      changed: next,
      message: `${def.name}: anotado que te lo llevas`,
      movements: [{ articleId: `loan:${def.id}`, lotId: '', kind: 'loan', amount: 1, detail: `${def.name}: se lo llevó ${ctx.by}` }],
    }
  }

  if (current.status === 'home') return { loans, changed: null, message: `${def.name}: ya estaba en casa`, movements: [] }
  const next: Loan = { ...current, status: 'home', returnedBy: ctx.by, returnedAt: ctx.today }
  return {
    loans: loans.map((entry) => (entry.id === next.id ? next : entry)),
    changed: next,
    message: `${def.name}: devuelto`,
    movements: [{ articleId: `loan:${def.id}`, lotId: '', kind: 'loan', amount: 0, detail: `${def.name}: lo devolvió ${ctx.by} (se lo había llevado ${current.takenBy ?? '—'})` }],
  }
}

export const outLoans = (loans: Loan[]) => loans.filter((entry) => entry.status === 'out')

export function seedLoans(): Loan[] {
  return loanableDefs.map((def) => ({ id: def.id, status: 'home', takenBy: null, takenAt: null, returnedBy: null, returnedAt: null }))
}
