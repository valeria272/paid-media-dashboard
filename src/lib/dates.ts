// ═══ Helpers de fechas para rangos mensuales ═══

export function getMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // Mes actual: dia 1 hasta hoy
  const currentStart = new Date(year, month, 1)
  const currentEnd = new Date(year, month, now.getDate())

  // Mes anterior: mismo rango de dias (1 al dia actual del mes pasado)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevStart = new Date(prevYear, prevMonth, 1)
  // Mismo numero de dias que llevamos del mes actual
  const prevEnd = new Date(prevYear, prevMonth, Math.min(now.getDate(), daysInMonth(prevYear, prevMonth)))

  return {
    current: {
      start: formatDate(currentStart),
      end: formatDate(currentEnd),
      days: now.getDate(),
      label: currentStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
    },
    previous: {
      start: formatDate(prevStart),
      end: formatDate(prevEnd),
      days: Math.min(now.getDate(), daysInMonth(prevYear, prevMonth)),
      label: prevStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
    },
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function calcVariation(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}
