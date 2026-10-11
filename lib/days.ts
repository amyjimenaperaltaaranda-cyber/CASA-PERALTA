/* Días como texto "YYYY-MM-DD" (hora de Lima). Sin horas: todo el inventario razona en días. */

const toUtc = (day: string) => {
  const [year, month, date] = day.split('-').map(Number)
  return Date.UTC(year, month - 1, date)
}

export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / 86_400_000)

export const addDays = (day: string, amount: number) => new Date(toUtc(day) + amount * 86_400_000).toISOString().slice(0, 10)

export const formatDay = (day: string) => new Date(toUtc(day)).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export const formatDayShort = (day: string) => new Date(toUtc(day)).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '')

/** "3 días", "1 semana", "1 mes"... para los botones de fecha de vencimiento. */
export function durationLabel(days: number) {
  if (days === 365) return '1 año'
  if (days === 180) return '6 meses'
  if (days === 90) return '3 meses'
  if (days === 30) return '1 mes'
  if (days === 21) return '3 semanas'
  if (days === 14) return '2 semanas'
  if (days === 7) return '1 semana'
  return `${days} ${days === 1 ? 'día' : 'días'}`
}
