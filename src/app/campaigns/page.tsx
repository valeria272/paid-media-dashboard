'use client'

import { useDashboardData } from '@/hooks/useDashboardData'
import { Sidebar } from '@/components/layout/Sidebar'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import { formatCLP, formatPercent } from '@/lib/format/currency'
import { PLATFORM_LABELS } from '@/config/platforms'
import { CampaignMetrics } from '@/lib/types'

export default function CampaignsPage() {
  const { data, isLoading, lastUpdated } = useDashboardData()

  const campaigns: CampaignMetrics[] = data?.campaigns || []

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Todas las Campanas</h1>
            <LiveIndicator lastUpdated={lastUpdated} />
          </div>

          {isLoading ? (
            <div className="animate-pulse h-64 bg-gray-200 rounded-xl" />
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">Campana</th>
                    <th className="text-left py-3 px-4 font-medium">Plataforma</th>
                    <th className="text-center py-3 px-4 font-medium">Estado</th>
                    <th className="text-right py-3 px-4 font-medium">Gasto</th>
                    <th className="text-right py-3 px-4 font-medium">Presupuesto</th>
                    <th className="text-right py-3 px-4 font-medium">Pacing</th>
                    <th className="text-right py-3 px-4 font-medium">Impresiones</th>
                    <th className="text-right py-3 px-4 font-medium">Clics</th>
                    <th className="text-right py-3 px-4 font-medium">CTR</th>
                    <th className="text-right py-3 px-4 font-medium">Conv.</th>
                    <th className="text-right py-3 px-4 font-medium">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => {
                    const pacing = campaign.budget > 0 ? (campaign.spend / campaign.budget) * 100 : 0
                    const pacingColor = pacing > 110 ? 'text-red-600' : pacing < 60 ? 'text-yellow-600' : 'text-green-600'
                    return (
                      <tr key={campaign.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${campaign.status !== 'active' ? 'opacity-50' : ''}`}>
                        <td className={`py-3 px-4 font-medium ${campaign.status === 'active' ? 'text-gray-900' : 'text-gray-400'}`}>{campaign.name}</td>
                        <td className="py-3 px-4 text-gray-600">{PLATFORM_LABELS[campaign.platform] || campaign.platform}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            campaign.status === 'active' ? 'bg-green-50 text-green-700' :
                            campaign.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {campaign.status === 'active' ? 'Activa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">{formatCLP(campaign.spend)}</td>
                        <td className="text-right py-3 px-4 text-gray-400">{formatCLP(campaign.budget)}</td>
                        <td className={`text-right py-3 px-4 font-medium ${pacingColor}`}>{formatPercent(pacing, 0)}</td>
                        <td className="text-right py-3 px-4">{campaign.impressions.toLocaleString('es-CL')}</td>
                        <td className="text-right py-3 px-4">{campaign.clicks.toLocaleString('es-CL')}</td>
                        <td className="text-right py-3 px-4">{formatPercent(campaign.ctr)}</td>
                        <td className="text-right py-3 px-4">{campaign.conversions}</td>
                        <td className="text-right py-3 px-4">{formatCLP(campaign.cpa)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
