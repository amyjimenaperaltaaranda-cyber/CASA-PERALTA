export type Access = 'admin' | 'member'
export type FamilyMember = { id: string; name: string; role: string; access: Access; tone: string }

export const household = 'Casa Peralta'

export const family: FamilyMember[] = [
  { id: 'amy', name: 'Amy', role: 'Administradora', access: 'admin', tone: 'from-rose-200 to-rose-400' },
  { id: 'consuelo', name: 'Consuelo', role: 'Mamá', access: 'member', tone: 'from-amber-200 to-orange-400' },
  { id: 'aby', name: 'Aby', role: 'Familia', access: 'member', tone: 'from-violet-200 to-violet-400' },
  { id: 'gabriel', name: 'Gabriel', role: 'Familia', access: 'member', tone: 'from-sky-200 to-sky-500' },
  { id: 'haniel', name: 'Haniel', role: 'Familia', access: 'member', tone: 'from-emerald-200 to-emerald-500' },
]

export type StockZone = 'fridge' | 'pantry' | 'cabinet' | 'shelf' | 'paper' | 'firstaid' | 'sink' | 'cleaning' | 'freezer' | 'fruit'

export const feedingPlan = [
  { cat: 'Monchi', slots: ['Mañana', 'Noche'] },
  { cat: 'Mandy', slots: ['Mañana', 'Tarde', 'Noche'] },
] as const

export const feedingKey = (cat: string, slot: string) => `${cat}:${slot}`

export const levelColor = (level: number) =>
  level >= 60 ? 'var(--hud-ok)' : level > 25 ? 'var(--hud-warn)' : 'var(--hud-danger)'

export const levelLabel = (level: number) => (level === 0 ? 'Agotado' : level <= 25 ? `Poco · ${level}%` : `${level}%`)
