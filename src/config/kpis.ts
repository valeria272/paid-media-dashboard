// ═══ Objetivos KPI por plataforma ═══
// IMPORTANTE: actualizar con los objetivos reales de cada cliente

export const KPI_TARGETS: Record<string, {
  maxCpa: number                    // CLP — 0 si no aplica
  minCtr: number                    // porcentaje
  minSpendForConversionAlert: number // CLP
  maxFrequency?: number             // solo Meta
}> = {
  google: {
    maxCpa: 30000,
    minCtr: 1.5,
    minSpendForConversionAlert: 50000,
  },
  meta: {
    maxCpa: 15000,
    minCtr: 0.5,
    minSpendForConversionAlert: 40000,
    maxFrequency: 3.5,
  },
  tiktok: {
    maxCpa: 20000,
    minCtr: 0.5,
    minSpendForConversionAlert: 30000,
  },
  linkedin: {
    maxCpa: 60000,
    minCtr: 0.3,
    minSpendForConversionAlert: 80000,
  },
  default: {
    maxCpa: 0,
    minCtr: 0.5,
    minSpendForConversionAlert: 50000,
  },
}
