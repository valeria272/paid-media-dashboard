'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend,
} from 'recharts'
import type { MasCenterInstagramData } from '@/lib/fetchers/masCenterInstagram'
import type { MasCenterFacebookData } from '@/lib/fetchers/masCenterFacebook'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ── Tipos ────────────────────────────────────────────────────

interface NotConfigured { notConfigured: true; missingVars: string[] }
interface PlatformError { error: string }
interface MasCenterData {
  instagram?: MasCenterInstagramData | NotConfigured | PlatformError
  facebook?: MasCenterFacebookData | NotConfigured | PlatformError
  fetchedAt?: string
}

function isNotConfigured(x: unknown): x is NotConfigured {
  return !!x && typeof x === 'object' && 'notConfigured' in x
}
function isError(x: unknown): x is PlatformError {
  return !!x && typeof x === 'object' && 'error' in x
}
function isInstagram(x: unknown): x is MasCenterInstagramData {
  return !!x && typeof x === 'object' && 'profile' in x && 'posts' in x
}
function isFacebook(x: unknown): x is MasCenterFacebookData {
  return !!x && typeof x === 'object' && 'fan_count' in x
}
function pctArrow(v: number) {
  const color = v > 0 ? 'text-emerald-500' : v < 0 ? 'text-red-400' : 'text-gray-400'
  const arrow = v > 0 ? '↑' : v < 0 ? '↓' : '→'
  return <span className={`font-semibold ${color}`}>{arrow} {Math.abs(v)}%</span>
}

// ── Componentes reutilizables ─────────────────────────────────

function KpiCard({ label, value, delta, sub, accent }: {
  label: string; value: string | number; delta?: number; sub?: string; accent?: string
}) {
  const accentStyle = accent ? { borderTopColor: accent, borderTopWidth: 3 } : {}
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100" style={accentStyle}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">
        {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {delta !== undefined && pctArrow(delta)}
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-100 my-10" />
}

function NotConnectedPlatform({ name }: { name: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
      <p className="text-sm text-gray-400">Datos de {name} próximamente disponibles</p>
    </div>
  )
}

// ── Sección: Comparativa mensual ─────────────────────────────

function MonthlyOverview({ ig, fb }: {
  ig?: MasCenterInstagramData;
  fb?: MasCenterFacebookData;
}) {
  if (!ig && !fb) return null

  const currentMonth = ig?.comparison.current_month || fb?.comparison.current_month || ''
  const prevMonth = ig?.comparison.prev_month || fb?.comparison.prev_month || ''

  const chartData = [
    ...(ig ? [
      { metric: 'Alcance IG', actual: ig.comparison.current_reach, anterior: ig.comparison.prev_reach, color: '#e1306c' },
      { metric: 'Interacc. IG', actual: ig.comparison.current_interactions, anterior: ig.comparison.prev_interactions, color: '#fd7e14' },
    ] : []),
    ...(fb ? [
      { metric: 'Alcance FB', actual: fb.comparison.current_reach, anterior: fb.comparison.prev_reach, color: '#1877f2' },
      { metric: 'Engaged FB', actual: fb.comparison.current_engaged, anterior: fb.comparison.prev_engaged, color: '#0ea5e9' },
    ] : []),
  ]

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">Comparativa mensual</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="font-medium text-gray-700">{currentMonth}</span>
            {' '}vs{' '}
            <span className="text-gray-500">{prevMonth}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-indigo-500" />
            <span className="text-gray-500">{currentMonth}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-200" />
            <span className="text-gray-500">{prevMonth}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
          <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={38}
            tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip
            formatter={(v, name) => [Number(v).toLocaleString('es-CL'), name === 'actual' ? currentMonth : prevMonth]}
            contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }} />
          <Bar dataKey="actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="anterior" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Variaciones en texto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-50">
        {ig && (
          <>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Alcance Instagram</p>
              <div className="text-sm font-semibold">{pctArrow(ig.comparison.reach_pct)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Interacciones IG</p>
              <div className="text-sm font-semibold">{pctArrow(ig.comparison.interactions_pct)}</div>
            </div>
          </>
        )}
        {fb && (
          <>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Alcance Facebook</p>
              <div className="text-sm font-semibold">{pctArrow(fb.comparison.reach_pct)}</div>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Usuarios activos FB</p>
              <div className="text-sm font-semibold">{pctArrow(fb.comparison.engaged_pct)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Sección: Mejores contenidos ───────────────────────────────

function BestContent({ ig }: { ig: MasCenterInstagramData }) {
  const topReels = [...ig.posts].filter(p => p.media_type === 'VIDEO')
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 3)
  const topPosts = [...ig.posts].filter(p => p.media_type !== 'VIDEO')
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 3)
  const topStories = ig.stories.filter(s => s.reach != null)
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0)).slice(0, 3)

  function MiniCard({ post, type }: { post: { id: string; media_url?: string; thumbnail_url?: string; permalink?: string; reach?: number; like_count?: number; comments_count?: number; timestamp: string; caption?: string }; type: 'reel' | 'post' | 'story' }) {
    const thumb = post.thumbnail_url || post.media_url
    const colorMap = { reel: '#6366f1', post: '#10b981', story: '#f59e0b' }
    const date = new Date(post.timestamp).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
    return (
      <a href={post.permalink || '#'} target="_blank" rel="noopener noreferrer"
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow block group">
        <div className="relative aspect-square bg-gray-100">
          {thumb && <Image src={thumb} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="200px" unoptimized />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <span className="text-xs text-white font-semibold bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {date}
            </span>
          </div>
          <div className="absolute top-2 left-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap[type] }} />
          </div>
        </div>
        <div className="p-3">
          {post.caption && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">{post.caption}</p>
          )}
          <div className="flex gap-2 text-xs text-gray-400">
            {post.reach != null && <span>👁 {post.reach.toLocaleString('es-CL')}</span>}
            {post.like_count != null && <span>♥ {post.like_count.toLocaleString('es-CL')}</span>}
          </div>
        </div>
      </a>
    )
  }

  return (
    <div className="space-y-8">
      {topReels.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 rounded-full bg-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700">Mejores Reels — por alcance</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {topReels.map(p => <MiniCard key={p.id} post={p} type="reel" />)}
          </div>
        </div>
      )}

      {topPosts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-gray-700">Mejores publicaciones — por alcance</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {topPosts.map(p => <MiniCard key={p.id} post={p} type="post" />)}
          </div>
        </div>
      )}

      {topStories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-6 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold text-gray-700">Historias destacadas — por alcance</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {topStories.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="relative bg-gray-900" style={{ aspectRatio: '9/16', height: 180 }}>
                  {s.media_url && <Image src={s.media_url} alt="Story" fill className="object-cover" sizes="160px" unoptimized />}
                </div>
                <div className="p-3 text-xs text-gray-500 space-y-0.5">
                  {s.reach != null && <p>👁 {s.reach.toLocaleString('es-CL')} alcance</p>}
                  {s.replies != null && s.replies > 0 && <p>💬 {s.replies} respuestas</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección: Engagement + horarios ───────────────────────────

function EngagementSection({ ig }: { ig: MasCenterInstagramData }) {
  const TYPE_COLORS: Record<string, string> = {
    Reel: '#6366f1', Carrusel: '#f59e0b', Foto: '#10b981',
  }

  const engRate = ig.profile.followers_count > 0
    ? ((ig.total_interactions_7d / 7) / ig.profile.followers_count * 100).toFixed(2)
    : '0.00'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Engagement por formato */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-5">Engagement por formato</h3>
        <div className="space-y-4">
          {ig.by_type.map(t => (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[t.type] || '#6b7280' }} />
                  <span className="text-sm font-medium text-gray-700">{t.type}</span>
                </div>
                <div className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-600">{t.avg_engagement}% ER</span>
                  {' · '}{t.count} posts
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (t.avg_reach / Math.max(...ig.by_type.map(x => x.avg_reach))) * 100)}%`,
                    backgroundColor: TYPE_COLORS[t.type] || '#6b7280',
                  }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Alcance promedio: {t.avg_reach.toLocaleString('es-CL')}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-gray-50 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{engRate}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Engagement rate diario</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{ig.total_interactions_7d.toLocaleString('es-CL')}</p>
            <p className="text-xs text-gray-400 mt-0.5">Interacciones 7 días</p>
          </div>
        </div>
      </div>

      {/* Mejores horarios */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-5">Mejores horarios para publicar</h3>
        {ig.best_hours.length > 0 ? (
          <>
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-gray-900">{ig.best_hours[0].hour}:00</p>
              <p className="text-sm text-gray-400 mt-1">
                Mejor hora · ER promedio <span className="font-semibold text-indigo-600">{ig.best_hours[0].avg_engagement}%</span>
              </p>
            </div>
            <div className="space-y-2.5">
              {ig.best_hours.slice(0, 5).map(h => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-14 font-mono">{h.hour}:00h</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${(h.avg_engagement / ig.best_hours[0].avg_engagement) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right font-medium">{h.avg_engagement}%</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">Sin datos suficientes de horarios</p>
        )}
      </div>
    </div>
  )
}

// ── Sección: Meta ─────────────────────────────────────────────

function MetaSection({ ig, fb }: {
  ig?: MasCenterInstagramData;
  fb?: MasCenterFacebookData;
}) {
  const totalFollowers = (ig?.profile.followers_count ?? 0) + (fb?.fan_count ?? 0)
  const totalReach = (ig?.reach_30d ?? 0) + (fb?.reach_month ?? 0)
  const totalInteractions = (ig?.total_interactions_7d ?? 0) + (fb?.engaged_users_month ?? 0)
  const totalViews = (ig?.profile_views_7d ?? 0) + (fb?.page_views_month ?? 0)

  const chartData = [
    { name: 'Seguidores', Instagram: ig?.profile.followers_count ?? 0, Facebook: fb?.fan_count ?? 0 },
    { name: 'Alcance', Instagram: ig?.reach_30d ?? 0, Facebook: fb?.reach_month ?? 0 },
    { name: 'Interacciones', Instagram: ig?.total_interactions_7d ?? 0, Facebook: fb?.engaged_users_month ?? 0 },
    { name: 'Visitas', Instagram: ig?.profile_views_7d ?? 0, Facebook: fb?.page_views_month ?? 0 },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs combinados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Seguidores totales" value={totalFollowers} accent="#1877f2" />
        <KpiCard label="Alcance combinado" value={totalReach} accent="#e1306c" />
        <KpiCard label="Interacciones" value={totalInteractions} accent="#f59e0b" />
        <KpiCard label="Visitas al perfil" value={totalViews} accent="#10b981" />
      </div>

      {/* Gráfico comparativo Instagram vs Facebook */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-gray-700">Instagram vs Facebook — métricas principales</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-rose-400" />
              <span className="text-gray-500">Instagram</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-gray-500">Facebook</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={6}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={38}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
              formatter={(v) => [Number(v).toLocaleString('es-CL'), '']} />
            <Bar dataKey="Instagram" fill="#fb7185" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Facebook" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Sección: Insights con IA ─────────────────────────────────

function InsightsSection({ data }: { data: MasCenterData }) {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ig = isInstagram(data.instagram) ? data.instagram : null
      const fb = isFacebook(data.facebook) ? data.facebook : null

      if (!ig && !fb) throw new Error('Sin datos de plataformas para analizar')

      const body: Record<string, unknown> = {}
      if (ig) body.instagram = {
        username: ig.profile.username,
        followers: ig.profile.followers_count,
        reach_30d: ig.reach_30d,
        interactions_7d: ig.total_interactions_7d,
        reach_pct: ig.comparison.reach_pct,
        interactions_pct: ig.comparison.interactions_pct,
        best_format: ig.by_type[0]?.type || 'N/D',
        best_hour: ig.best_hours[0]?.hour ?? 18,
        stories_views: ig.stories_views_7d,
      }
      if (fb) body.facebook = {
        page_name: fb.page_name,
        fan_count: fb.fan_count,
        fan_adds: fb.fan_adds_month,
        reach_month: fb.reach_month,
        reach_pct: fb.comparison.reach_pct,
        engaged_users: fb.engaged_users_month,
      }
      const res = await fetch('/api/social/mas-center/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json() as { text?: string; error?: string }
      if (result.error) throw new Error(result.error)
      setInsights(result.text || 'Sin insights generados')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando insights')
    } finally {
      setLoading(false)
    }
  }, [data])

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Insights y recomendaciones</h3>
          <p className="text-sm text-gray-500">
            Análisis generado con IA basado en los datos del mes
          </p>
        </div>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 flex-shrink-0"
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analizando…
            </>
          ) : insights ? 'Regenerar' : 'Generar con Claude'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
      )}

      {insights ? (
        <div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-sm">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{insights}</p>
        </div>
      ) : !loading && !error && (
        <div className="bg-white/60 rounded-xl p-6 text-center border border-dashed border-indigo-200">
          <p className="text-sm text-gray-400">
            Haz clic en "Generar con Claude" para obtener insights del mes basados en los datos reales de las plataformas.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function MasCenterClientePage() {
  const [period] = useState(30)

  const { data, isLoading } = useSWR<MasCenterData>(
    `/api/social/mas-center?period=${period}`,
    fetcher,
    { refreshInterval: 15 * 60 * 1000 }
  )

  const ig = isInstagram(data?.instagram) ? data!.instagram as MasCenterInstagramData : null
  const fb = isFacebook(data?.facebook) ? data!.facebook as MasCenterFacebookData : null

  const today = new Date()
  const monthLabel = today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const monthCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Mas Center</p>
              <p className="text-xs text-gray-400">Reporte de Redes Sociales</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium">{monthCapitalized}</span>
            <button
              onClick={() => window.print()}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Imprimir
            </button>
          </div>
        </div>
      </header>

      {/* Loader */}
      {isLoading && (
        <div className="max-w-6xl mx-auto px-6 py-12 animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded-xl w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="h-56 bg-gray-200 rounded-2xl" />
        </div>
      )}

      {!isLoading && data && (
        <main className="max-w-6xl mx-auto px-6 py-10 space-y-0">

          {/* ── 1. Actualizaciones del mes ── */}
          <section className="pb-10">
            <SectionHeader icon="📊" title="Panorama del mes"
              subtitle={`Resumen ejecutivo · ${monthCapitalized}`} />

            {/* Métricas principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {ig && (
                <>
                  <KpiCard label="Seguidores Instagram" value={ig.profile.followers_count}
                    delta={ig.comparison.reach_pct > 0 ? ig.comparison.reach_pct : undefined}
                    accent="#e1306c" />
                  <KpiCard label="Alcance Instagram 30d" value={ig.reach_30d}
                    delta={ig.comparison.reach_pct} sub="personas únicas" accent="#fd7e14" />
                </>
              )}
              {fb && (
                <>
                  <KpiCard label="Seguidores Facebook" value={fb.fan_count} accent="#1877f2" />
                  <KpiCard label="Alcance Facebook" value={fb.reach_month}
                    delta={fb.comparison.reach_pct} sub="este mes" accent="#0ea5e9" />
                </>
              )}
              {!ig && !fb && (
                <div className="col-span-4">
                  <NotConnectedPlatform name="las plataformas" />
                </div>
              )}
            </div>

            {/* Alcance diario */}
            {ig && ig.reach_series.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-5">Alcance diario Instagram — últimos {period} días</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={ig.reach_series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="clientIgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                      interval={Math.floor(ig.reach_series.length / 6)}
                      tickFormatter={d => { const [,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}` }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={38}
                      tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
                      formatter={(v) => [Number(v).toLocaleString('es-CL'), 'Alcance']}
                      labelFormatter={d => { const [y,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}/${y}` }} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#clientIgGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <Divider />

          {/* ── 2. Comparativa mensual ── */}
          <section className="pb-10">
            <SectionHeader icon="📈" title="Comparativa mensual"
              subtitle="Mes actual vs mes anterior — misma cantidad de días" />
            {ig || fb ? (
              <MonthlyOverview ig={ig ?? undefined} fb={fb ?? undefined} />
            ) : (
              <NotConnectedPlatform name="las plataformas" />
            )}
          </section>

          <Divider />

          {/* ── 3. Resumen de interacciones ── */}
          {ig && (
            <>
              <section className="pb-10">
                <SectionHeader icon="💬" title="Resumen de interacciones"
                  subtitle="Desglose por tipo de contenido — Stories, Reels y Posts" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Stories (7 días)</p>
                    <p className="text-4xl font-bold text-amber-500">
                      {ig.stories_views_7d.toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">visualizaciones</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {ig.stories_replies_7d.toLocaleString('es-CL')} respuestas
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Feed (posts + reels)</p>
                    <p className="text-4xl font-bold text-indigo-500">
                      {ig.total_interactions_7d.toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">interacciones (7d)</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {ig.accounts_engaged_7d.toLocaleString('es-CL')} cuentas activas
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Visitas al perfil</p>
                    <p className="text-4xl font-bold text-emerald-500">
                      {ig.profile_views_7d.toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">últimos 7 días</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Alcance 7d: {ig.reach_7d.toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </section>

              <Divider />

              {/* ── 4. Mejores contenidos ── */}
              <section className="pb-10">
                <SectionHeader icon="🏆" title="Mejores contenidos del mes"
                  subtitle="Ordenados por alcance — Reels, Posts e Historias" />
                <BestContent ig={ig} />
              </section>

              <Divider />

              {/* ── 5. Engagement + horarios ── */}
              <section className="pb-10">
                <SectionHeader icon="⏰" title="Engagement y mejores horarios"
                  subtitle="Rendimiento por formato y análisis de timing" />
                <EngagementSection ig={ig} />
              </section>

              <Divider />
            </>
          )}

          {/* ── 6. Meta (Instagram + Facebook combinado) ── */}
          {(ig || fb) && (
            <>
              <section className="pb-10">
                <SectionHeader icon="📘" title="Meta — Instagram & Facebook"
                  subtitle="Visión consolidada del ecosistema Meta" />
                <MetaSection ig={ig ?? undefined} fb={fb ?? undefined} />
              </section>
              <Divider />
            </>
          )}

          {/* ── 7. Insights y conclusiones ── */}
          <section className="pb-10">
            <SectionHeader icon="💡" title="Insights y conclusiones"
              subtitle="Recomendaciones para el próximo mes generadas con IA" />
            <InsightsSection data={data} />
          </section>

        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-400">
          <span>Mas Center · Reporte {monthCapitalized} · Generado por Grupo CopyLab</span>
          {data?.fetchedAt && (
            <span>Datos al {new Date(data.fetchedAt).toLocaleString('es-CL')}</span>
          )}
        </div>
      </footer>
    </div>
  )
}
