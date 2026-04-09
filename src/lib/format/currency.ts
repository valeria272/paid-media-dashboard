// ═══ Formateo CLP y helpers ═══
// Regla: NUNCA decimales en montos CLP, NUNCA coma como separador de miles

export const formatCLP = (value: number): string => {
  return '$' + Math.round(value).toLocaleString('es-CL')
}

export const formatPercent = (value: number, decimals = 2): string => {
  return value.toFixed(decimals).replace('.', ',') + '%'
}

export const formatVariation = (value: number): string => {
  const sign = value >= 0 ? '+' : ''
  return sign + value.toFixed(1).replace('.', ',') + '%'
}

export const formatNumber = (value: number): string => {
  return Math.round(value).toLocaleString('es-CL')
}

export const formatCLPCompact = (value: number): string => {
  if (value >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  }
  if (value >= 1_000) {
    return '$' + Math.round(value / 1_000) + 'K'
  }
  return formatCLP(value)
}
