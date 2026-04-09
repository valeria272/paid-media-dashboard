// ═══ Presupuestos aprobados desde Google Sheets ═══

import { CampaignMetrics } from '@/lib/types'

export interface BudgetRow {
  campaignName: string
  channel: string            // "Meta Ads", "Google Ads"
  monthlyBudget: number      // CLP
  month: string              // "abril", "mayo", etc
}

export interface BudgetAlert {
  severity: 'critical' | 'warning' | 'opportunity'
  campaignName: string
  channel: string
  message: string
  budgetApproved: number
  currentSpend: number
  projectedSpend: number
  percentUsed: number
}

export async function fetchBudgets(): Promise<BudgetRow[]> {
  const sheetId = process.env.BUDGET_SHEET_ID
  const sheetName = process.env.BUDGET_SHEET_NAME
  if (!sheetId || !sheetName || !process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return []
  }

  try {
    const token = await getAccessToken()
    const range = encodeURIComponent(sheetName)

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!response.ok) {
      console.error('[Sheets] Error:', response.status)
      return []
    }

    const data = await response.json()
    const rows = data.values || []

    // Saltar header (fila 0)
    return rows.slice(1).map((row: string[]): BudgetRow => {
      // Limpiar el monto: "$90.000" → 90000
      const rawBudget = (row[2] || '0').replace(/[$.\s]/g, '').replace(/,/g, '')

      return {
        campaignName: (row[0] || '').trim(),
        channel: (row[1] || '').trim(),
        monthlyBudget: Number(rawBudget) || 0,
        month: (row[4] || '').trim().toLowerCase(),
      }
    }).filter((b: BudgetRow) => b.monthlyBudget > 0)
  } catch (error) {
    console.error('[Sheets] Error fetching budgets:', error)
    return []
  }
}

// ═══ Comparar gasto real vs presupuesto aprobado ═══

export function detectBudgetAlerts(
  campaigns: CampaignMetrics[],
  budgets: BudgetRow[],
  currentDay: number,
  daysInMonth: number
): BudgetAlert[] {
  const alerts: BudgetAlert[] = []

  for (const budget of budgets) {
    // Mapear canal del sheet a platform del sistema
    const platformMap: Record<string, string> = {
      'meta ads': 'meta', 'facebook ads': 'meta', 'meta': 'meta',
      'google ads': 'google', 'google': 'google',
    }
    const platform = platformMap[budget.channel.toLowerCase()] || ''

    // Matchear: primero por nombre, si no por canal completo
    const campaign = campaigns.find(c => {
      const budgetLower = budget.campaignName.toLowerCase()
      const campLower = c.name.toLowerCase()
      return campLower.includes(budgetLower.split('|')[0]?.trim() || '') ||
             budgetLower.includes(campLower.split('|')[0]?.trim() || '') ||
             campLower.includes(budgetLower.split('-')[0]?.trim() || '') ||
             budgetLower.includes(campLower.split('-')[0]?.trim() || '')
    })

    // Si no matchea por nombre, sumar TODO el gasto de esa plataforma
    const currentSpend = campaign?.spend ||
      (platform ? campaigns.filter(c => c.platform === platform).reduce((sum, c) => sum + c.spend, 0) : 0)
    const percentUsed = budget.monthlyBudget > 0 ? (currentSpend / budget.monthlyBudget) * 100 : 0

    // Proyeccion lineal: si gasta X en N dias, cuanto gastara en el mes completo
    const dailyAvg = currentDay > 0 ? currentSpend / currentDay : 0
    const projectedSpend = Math.round(dailyAvg * daysInMonth)
    const projectedPercent = budget.monthlyBudget > 0 ? (projectedSpend / budget.monthlyBudget) * 100 : 0

    // Proyeccion supera presupuesto en >20% → critico
    if (projectedPercent > 120) {
      alerts.push({
        severity: 'critical',
        campaignName: budget.campaignName,
        channel: budget.channel,
        message: `Proyeccion de gasto ${formatCLP(projectedSpend)} supera presupuesto aprobado (${formatCLP(budget.monthlyBudget)}) en ${(projectedPercent - 100).toFixed(0)}%. Ritmo: ${formatCLP(dailyAvg)}/dia.`,
        budgetApproved: budget.monthlyBudget,
        currentSpend,
        projectedSpend,
        percentUsed,
      })
    }
    // Proyeccion supera presupuesto en 5-20% → warning
    else if (projectedPercent > 105) {
      alerts.push({
        severity: 'warning',
        campaignName: budget.campaignName,
        channel: budget.channel,
        message: `Proyeccion de gasto ${formatCLP(projectedSpend)} podria superar presupuesto (${formatCLP(budget.monthlyBudget)}) en ${(projectedPercent - 100).toFixed(0)}%.`,
        budgetApproved: budget.monthlyBudget,
        currentSpend,
        projectedSpend,
        percentUsed,
      })
    }
    // Subejecucion: proyeccion <60% del presupuesto → oportunidad
    else if (projectedPercent < 60 && currentDay >= 5) {
      alerts.push({
        severity: 'opportunity',
        campaignName: budget.campaignName,
        channel: budget.channel,
        message: `Subejecucion: proyeccion ${formatCLP(projectedSpend)} es solo ${projectedPercent.toFixed(0)}% del presupuesto aprobado (${formatCLP(budget.monthlyBudget)}).`,
        budgetApproved: budget.monthlyBudget,
        currentSpend,
        projectedSpend,
        percentUsed,
      })
    }
  }

  return alerts.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, opportunity: 2 }
    return order[a.severity] - order[b.severity]
  })
}

function formatCLP(value: number): string {
  return '$' + Math.round(value).toLocaleString('es-CL')
}

async function getAccessToken(): Promise<string> {
  const { google } = await import('googleapis')
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN })
  const { token } = await oauth2Client.getAccessToken()
  return token || ''
}
