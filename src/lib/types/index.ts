// ═══ Tipos compartidos del proyecto ═══

export type Platform = 'google' | 'meta' | 'tiktok' | 'linkedin'
export type CampaignStatus = 'active' | 'paused' | 'ended'
export type AlertSeverity = 'critical' | 'warning' | 'opportunity'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface CampaignMetrics {
  id: string
  name: string
  platform: Platform
  status: CampaignStatus
  spend: number          // CLP — siempre entero
  budget: number         // CLP — presupuesto diario
  impressions: number
  clicks: number
  ctr: number            // porcentaje, ej: 3.45
  conversions: number
  cpa: number            // CLP
  roas?: number          // solo e-commerce
  updatedAt: string      // ISO string
}

export interface DashboardSummary {
  totalSpend: number
  totalBudget: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCtr: number
  avgCpa: number
  avgRoas?: number
  byPlatform: Record<string, PlatformSummary>
  alerts: Alert[]
  lastUpdated: string
}

export interface Alert {
  id: string
  severity: AlertSeverity
  platform: string
  campaignName: string
  message: string
  metric: string
  currentValue: number | string
  expectedValue: number | string
  detectedAt: string
  slackSent?: boolean
}

export interface PlatformSummary {
  spend: number
  budget: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  cpa: number
  campaignCount: number
  activeCampaignCount: number
}

// ═══ Aprobaciones humanas ═══

export interface ApprovalRequest {
  id: string
  type: 'budget_change' | 'pause_campaign' | 'enable_campaign' | 'bid_change' | 'optimization'
  platform: Platform
  campaignName: string
  description: string
  currentValue: string
  proposedValue: string
  reason: string
  impact: string
  status: ApprovalStatus
  createdAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
}

// ═══ Recaps ═══

export interface DailyRecap {
  date: string
  totalSpend: number
  totalBudget: number
  pacingPercent: number
  totalConversions: number
  avgCpa: number
  topCampaign: string
  worstCampaign: string
  alertsSummary: {
    critical: number
    warning: number
    opportunity: number
  }
  platformBreakdown: Record<string, PlatformSummary>
  recommendations: string[]
}

// ═══ Planilla de medios ═══

export interface MediaPlanRow {
  platform: Platform
  campaignName: string
  monthlyBudget: number
  dailyBudget: number
  kpiTarget: string
  kpiValue: number
  startDate: string
  endDate: string
  status: string
}

export interface MediaPlanComparison {
  platform: Platform
  campaignName: string
  plannedSpend: number
  actualSpend: number
  variance: number
  variancePercent: number
  plannedKpi: number
  actualKpi: number
  onTrack: boolean
}
