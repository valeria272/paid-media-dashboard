'use client'

import { useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts'
import { Sidebar } from '@/components/layout/Sidebar'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import type { MasCenterInstagramData } from '@/lib/fetchers/masCenterInstagram'
import type { MasCenterFacebookData } from '@/lib/fetchers/masCenterFacebook'
import type { MasCenterLinkedinData } from '@/lib/fetchers/masCenterLinkedin'
import type { ContentGridResponse, ContentGridItem } from '@/app/api/social/mas-center/content-grid/route'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ── Tipos de respuesta agregada ──────────────────────────────

interface NotConfigured {
  notConfigured: true
  missingVars: string[]
  setupUrl: string
}

interface PlatformError {
  error: string
}

interface MasCenterData {
  instagram?: MasCenterInstagramData | NotConfigured | PlatformError
  facebook?: MasCenterFacebookData | NotConfigured | PlatformError
  linkedin?: MasCenterLinkedinData | NotConfigured | PlatformError
  fetchedAt?: string
}

// ── Helpers ──────────────────────────────────────────────────

function isNotConfigured(x: unknown): x is NotConfigured {
  return !!x && typeof x === 'object' && 'notConfigured' in x && (x as NotConfigured).notConfigured === true
}
function isError(x: unknown): x is PlatformError {
  return !!x && typeof x === 'object' && 'error' in x
}
function pctColor(v: number) {
  if (v > 0) return 'text-green-600'
  if (v < 0) return 'text-red-500'
  return 'text-gray-500'
}
function pctLabel(v: number) {
  return v >= 0 ? `+${v}%` : `${v}%`
}

// ── Componentes base ─────────────────────────────────────────

function StatCard({ label, value, sub, delta, highlight }: {
  label: string; value: string | number; sub?: string; delta?: number; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 border shadow-sm ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {delta !== undefined && (
          <span className={`text-xs font-medium ${pctColor(delta)}`}>{pctLabel(delta)} vs mes ant.</span>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-gray-700">{children}</h2>
      {action}
    </div>
  )
}

function NotConnectedCard({ platform, vars, setupUrl }: {
  platform: string; vars: string[]; setupUrl: string
}) {
  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center text-center gap-3">
      <div className="text-3xl">{
        platform === 'Instagram' ? '📸' :
        platform === 'Facebook' ? '📘' :
        platform === 'LinkedIn' ? '💼' : '🔗'
      }</div>
      <div>
        <p className="text-sm font-semibold text-gray-700">{platform} no conectado</p>
        <p className="text-xs text-gray-400 mt-1">Agrega estas variables a .env.local</p>
      </div>
      <div className="bg-gray-900 rounded-lg p-3 text-left w-full">
        {vars.map(v => (
          <p key={v} className="text-xs font-mono text-green-400">{v}=...</p>
        ))}
      </div>
      <a href={setupUrl} target="_blank" rel="noopener noreferrer"
        className="text-xs text-indigo-500 hover:underline">
        Ver documentación →
      </a>
    </div>
  )
}

// ── Grilla de contenido ──────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#e1306c',
  Facebook: '#1877f2',
  LinkedIn: '#0a66c2',
  Todas: '#6366f1',
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  Reel: '#6366f1',
  Carrusel: '#f59e0b',
  Foto: '#10b981',
  Story: '#8b5cf6',
  Post: '#3b82f6',
  Video: '#ef4444',
}

const PRIORITY_STYLES: Record<string, string> = {
  alta: 'bg-red-50 border-red-200 text-red-700',
  media: 'bg-amber-50 border-amber-200 text-amber-700',
  baja: 'bg-gray-50 border-gray-200 text-gray-600',
}

function ContentGridTable({ grid }: { grid: ContentGridItem[] }) {
  const [filterPlatform, setFilterPlatform] = useState<string>('todas')
  const [filterWeek, setFilterWeek] = useState<number>(0)

  const platforms = ['todas', 'Instagram', 'Facebook', 'LinkedIn']
  const weeks = [0, 1, 2, 3, 4]

  const filtered = grid.filter(item => {
    const matchPlatform = filterPlatform === 'todas' || item.platform === filterPlatform || item.platform === 'Todas'
    const matchWeek = filterWeek === 0 || item.week === filterWeek
    return matchPlatform && matchWeek
  })

  return (
    <div>
      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
          {platforms.map(p => (
            <button key={p} onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                filterPlatform === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
          {weeks.map(w => (
            <button key={w} onClick={() => setFilterWeek(w)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filterWeek === w ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              {w === 0 ? 'Todas' : `Sem. ${w}`}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} publicaciones</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold w-32">Fecha</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold w-24">Plataforma</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold w-24">Formato</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold">Tema / Idea</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold">Hook</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold w-20">Hora</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold w-16">Prior.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((item, i) => (
              <tr key={i} className="bg-white hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                  <div>{item.date_label}</div>
                  {item.event_related && (
                    <span className="text-indigo-500 text-xs">★ {item.event_related}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-white font-medium text-xs whitespace-nowrap"
                    style={{ backgroundColor: PLATFORM_COLORS[item.platform] || '#6b7280' }}>
                    {item.platform}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full font-medium text-xs whitespace-nowrap"
                    style={{
                      backgroundColor: (CONTENT_TYPE_COLORS[item.content_type] || '#6b7280') + '20',
                      color: CONTENT_TYPE_COLORS[item.content_type] || '#6b7280',
                    }}>
                    {item.content_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900 mb-0.5">{item.topic}</p>
                  <p className="text-gray-400 line-clamp-2 leading-relaxed">{item.caption_idea}</p>
                  <div className="mt-1 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.hashtags.slice(0, 3).map(h => (
                      <span key={h} className="text-indigo-400 text-xs">{h}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs">
                  <p className="italic line-clamp-2">"{item.hook}"</p>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono">{item.best_time}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${PRIORITY_STYLES[item.priority]}`}>
                    {item.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            No hay publicaciones con los filtros seleccionados
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sección Instagram ────────────────────────────────────────

function InstagramSection({ data }: { data: MasCenterInstagramData }) {
  const TYPE_COLORS: Record<string, string> = {
    Reel: '#6366f1', Carrusel: '#f59e0b', Foto: '#10b981',
  }
  const topPosts = [...data.posts].sort((a, b) => (b.reach ?? b.like_count) - (a.reach ?? a.like_count))
  const topReels = topPosts.filter(p => p.media_type === 'VIDEO')
  const topCarrusel = topPosts.filter(p => p.media_type === 'CAROUSEL_ALBUM')
  const topFotos = topPosts.filter(p => p.media_type === 'IMAGE')
  const engRate = data.profile.followers_count > 0
    ? ((data.total_interactions_7d / 7) / data.profile.followers_count * 100).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-6">
      {/* Perfil + KPIs */}
      <div className="flex items-center gap-4 mb-2">
        {data.profile.profile_picture_url && (
          <Image src={data.profile.profile_picture_url} alt={data.profile.username}
            width={40} height={40} className="rounded-full border-2 border-pink-200" unoptimized />
        )}
        <div>
          <p className="font-semibold text-gray-900">@{data.profile.username}</p>
          <a href={`https://www.instagram.com/${data.profile.username}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline">Ver perfil →</a>
        </div>
        <div className="ml-auto text-xs text-gray-400">
          Comparativa: {data.comparison.current_month} vs {data.comparison.prev_month}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Seguidores" value={data.profile.followers_count} highlight />
        <StatCard label="Alcance 30d" value={data.reach_30d} delta={data.comparison.reach_pct} />
        <StatCard label="Interacciones 7d" value={data.total_interactions_7d} delta={data.comparison.interactions_pct} />
        <StatCard label="ER diaria" value={`${engRate}%`} sub="interacciones / seguidores" />
      </div>

      {/* Gráfico alcance diario */}
      {data.reach_series.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Alcance diario — últimos 30 días</SectionTitle>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data.reach_series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e1306c" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#e1306c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                interval={Math.floor(data.reach_series.length / 5)}
                tickFormatter={d => { const [,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}` }} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(v) => [Number(v).toLocaleString('es-CL'), 'Alcance']}
                labelFormatter={d => { const [y,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}/${y}` }} />
              <Area type="monotone" dataKey="value" stroke="#e1306c" strokeWidth={2} fill="url(#igGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top posts por alcance */}
      {topPosts.length > 0 && (
        <div>
          <SectionTitle>Mejores posts por alcance</SectionTitle>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {topPosts.slice(0, 6).map(post => {
              const typeLabel = post.media_type === 'VIDEO' ? 'Reel' : post.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Foto'
              const thumb = post.thumbnail_url || post.media_url
              return (
                <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow block">
                  <div className="relative aspect-square bg-gray-100">
                    {thumb && <Image src={thumb} alt="" fill className="object-cover" sizes="160px" unoptimized />}
                    <div className="absolute top-1 right-1">
                      <span className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                        style={{ backgroundColor: TYPE_COLORS[typeLabel] || '#6b7280', fontSize: 10 }}>
                        {typeLabel}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 text-xs text-gray-500 space-y-0.5">
                    {post.reach != null && <p>👁 {post.reach.toLocaleString('es-CL')}</p>}
                    <p>♥ {post.like_count.toLocaleString('es-CL')} · 💬 {post.comments_count.toLocaleString('es-CL')}</p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Breakdown por tipo + mejores horas */}
      <div className="grid grid-cols-2 gap-4">
        {data.by_type.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <SectionTitle>Rendimiento por tipo</SectionTitle>
            <div className="space-y-3">
              {data.by_type.map(t => (
                <div key={t.type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: TYPE_COLORS[t.type] }}>{t.type}</span>
                    <span className="text-xs text-gray-400">{t.count} posts · ER {t.avg_engagement}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (t.avg_reach / Math.max(...data.by_type.map(x => x.avg_reach))) * 100)}%`,
                        backgroundColor: TYPE_COLORS[t.type] }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Alcance avg: {t.avg_reach.toLocaleString('es-CL')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.best_hours.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <SectionTitle>Mejores horarios</SectionTitle>
            <div className="text-center mb-3">
              <p className="text-3xl font-bold text-pink-600">{data.best_hours[0].hour}:00</p>
              <p className="text-xs text-gray-400">ER promedio: {data.best_hours[0].avg_engagement}%</p>
            </div>
            <div className="space-y-1.5">
              {data.best_hours.slice(0, 4).map(h => (
                <div key={h.hour} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-12">{h.hour}:00h</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${(h.avg_engagement / data.best_hours[0].avg_engagement) * 100}%` }} />
                  </div>
                  <span className="text-gray-400 w-10 text-right">{h.avg_engagement}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sección Facebook ─────────────────────────────────────────

function FacebookSection({ data }: { data: MasCenterFacebookData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">{data.page_name}</p>
        <span className="text-xs text-gray-400">
          {data.comparison.current_month} vs {data.comparison.prev_month}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Seguidores" value={data.fan_count} highlight />
        <StatCard label="Nuevos seguidores" value={data.fan_adds_month} sub="este mes" />
        <StatCard label="Alcance mensual" value={data.reach_month} delta={data.comparison.reach_pct} />
        <StatCard label="Usuarios interactuaron" value={data.engaged_users_month} delta={data.comparison.engaged_pct} />
      </div>

      {data.reach_series.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <SectionTitle>Alcance diario</SectionTitle>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={data.reach_series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1877f2" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1877f2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                interval={Math.floor(data.reach_series.length / 5)}
                tickFormatter={d => { const [,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}` }} />
              <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke="#1877f2" strokeWidth={2} fill="url(#fbGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.posts.length > 0 && (
        <div>
          <SectionTitle>Posts recientes — por alcance</SectionTitle>
          <div className="space-y-2">
            {data.posts.slice(0, 5).map(post => (
              <a key={post.id} href={post.permalink_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
                {post.full_picture && (
                  <div className="relative w-14 h-14 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <Image src={post.full_picture} alt="" fill className="object-cover" sizes="56px" unoptimized />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {post.message || '(sin texto)'}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1">
                    <span>♥ {post.reactions_count.toLocaleString('es-CL')}</span>
                    <span>💬 {post.comments_count.toLocaleString('es-CL')}</span>
                    <span>↗ {post.shares_count.toLocaleString('es-CL')}</span>
                    {post.reach != null && <span>👁 {post.reach.toLocaleString('es-CL')}</span>}
                    {post.engagement_rate != null && (
                      <span className="text-indigo-500 font-medium">ER {post.engagement_rate}%</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {new Date(post.created_time).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sección LinkedIn ─────────────────────────────────────────

function LinkedInSection({ data }: { data: MasCenterLinkedinData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-900">{data.org_name}</p>
        <span className="text-xs text-gray-400">
          {data.comparison.current_month} vs {data.comparison.prev_month}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Seguidores" value={data.follower_count} highlight />
        <StatCard label="Nuevos seguidores" value={data.follower_gain_month} sub="este mes"
          delta={data.comparison.followers_pct} />
        <StatCard label="Impresiones" value={data.total_impressions_month}
          delta={data.comparison.impressions_pct} />
        <StatCard label="Engagement rate" value={`${data.engagement_rate}%`} sub="impresiones totales" />
      </div>

      {data.posts.length > 0 && (
        <div>
          <SectionTitle>Posts recientes</SectionTitle>
          <div className="space-y-2">
            {data.posts.slice(0, 5).map(post => (
              <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">{post.text || '(sin texto)'}</p>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>👁 {post.impressions.toLocaleString('es-CL')} imp.</span>
                  <span>♥ {post.reactions}</span>
                  <span>💬 {post.comments}</span>
                  <span>↗ {post.shares}</span>
                  <span className="text-indigo-500 font-medium ml-auto">ER {post.engagement_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export default function MasCenterPage() {
  const [period, setPeriod] = useState(30)
  const [activeTab, setActiveTab] = useState<'instagram' | 'facebook' | 'linkedin' | 'contenido'>('instagram')
  const [briefing, setBriefing] = useState('')
  const [gridLoading, setGridLoading] = useState(false)
  const [grid, setGrid] = useState<ContentGridResponse | null>(null)
  const [gridError, setGridError] = useState<string | null>(null)
  const briefingRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useSWR<MasCenterData>(
    `/api/social/mas-center?period=${period}`,
    fetcher,
    { refreshInterval: 10 * 60 * 1000 }
  )

  const generateGrid = useCallback(async () => {
    if (!briefing.trim()) return
    setGridLoading(true)
    setGridError(null)
    try {
      // Pasar contexto de Instagram si está disponible
      const igData = data?.instagram
      const context = igData && !isNotConfigured(igData) && !isError(igData) ? {
        best_hours: (igData as MasCenterInstagramData).best_hours,
        by_type: (igData as MasCenterInstagramData).by_type,
        followers: (igData as MasCenterInstagramData).profile.followers_count,
        username: (igData as MasCenterInstagramData).profile.username,
      } : undefined

      const res = await fetch('/api/social/mas-center/content-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing, context }),
      })
      const result = await res.json() as ContentGridResponse | { error: string }
      if ('error' in result) throw new Error(result.error)
      setGrid(result as ContentGridResponse)
    } catch (err) {
      setGridError(err instanceof Error ? err.message : 'Error generando grilla')
    } finally {
      setGridLoading(false)
    }
  }, [briefing, data])

  const TABS = [
    { id: 'instagram' as const, label: 'Instagram', icon: '📸' },
    { id: 'facebook' as const, label: 'Facebook', icon: '📘' },
    { id: 'linkedin' as const, label: 'LinkedIn', icon: '💼' },
    { id: 'contenido' as const, label: 'Contenido', icon: '📅' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8 max-w-7xl overflow-x-hidden">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mas Center — Redes Sociales</h1>
            <p className="text-sm text-gray-500 mt-0.5">Dashboard orgánico · Instagram, Facebook, LinkedIn</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
              {[7, 14, 30, 90].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-2 font-medium transition-colors ${
                    period === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  {p}d
                </button>
              ))}
            </div>
            <Link href="/social/mas-center/cliente" target="_blank"
              className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5">
              🔗 Vista cliente
            </Link>
            {!isLoading && <LiveIndicator />}
          </div>
        </div>

        {/* Tabs de plataformas */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-40 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
            </div>
          </div>
        )}

        {/* Contenido de cada tab */}
        {!isLoading && data && (
          <>
            {/* ── Instagram ── */}
            {activeTab === 'instagram' && (
              <>
                {isNotConfigured(data.instagram) ? (
                  <NotConnectedCard platform="Instagram"
                    vars={(data.instagram as NotConfigured).missingVars}
                    setupUrl={(data.instagram as NotConfigured).setupUrl} />
                ) : isError(data.instagram) ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                    Error Instagram: {(data.instagram as PlatformError).error}
                  </div>
                ) : (
                  <InstagramSection data={data.instagram as MasCenterInstagramData} />
                )}
              </>
            )}

            {/* ── Facebook ── */}
            {activeTab === 'facebook' && (
              <>
                {isNotConfigured(data.facebook) ? (
                  <NotConnectedCard platform="Facebook"
                    vars={(data.facebook as NotConfigured).missingVars}
                    setupUrl={(data.facebook as NotConfigured).setupUrl} />
                ) : isError(data.facebook) ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                    Error Facebook: {(data.facebook as PlatformError).error}
                  </div>
                ) : (
                  <FacebookSection data={data.facebook as MasCenterFacebookData} />
                )}
              </>
            )}

            {/* ── LinkedIn ── */}
            {activeTab === 'linkedin' && (
              <>
                {isNotConfigured(data.linkedin) ? (
                  <NotConnectedCard platform="LinkedIn"
                    vars={(data.linkedin as NotConfigured).missingVars}
                    setupUrl={(data.linkedin as NotConfigured).setupUrl} />
                ) : isError(data.linkedin) ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                    Error LinkedIn: {(data.linkedin as PlatformError).error}
                  </div>
                ) : (
                  <LinkedInSection data={data.linkedin as MasCenterLinkedinData} />
                )}
              </>
            )}

            {/* ── Contenido (ideas + grilla) ── */}
            {activeTab === 'contenido' && (
              <div className="space-y-6">
                {/* Briefing */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <SectionTitle>
                    Generador de grilla de contenido
                    <Link href="/social/mas-center/cliente#grilla" target="_blank"
                      className="text-xs text-indigo-500 hover:underline">
                      Ver grilla en vista cliente →
                    </Link>
                  </SectionTitle>
                  <p className="text-sm text-gray-500 mb-4">
                    Describe los eventos, fechas especiales y temáticas del próximo mes. Claude generará una grilla de
                    20 publicaciones distribuidas en 4 semanas para todas las plataformas.
                  </p>
                  <textarea
                    ref={briefingRef}
                    value={briefing}
                    onChange={e => setBriefing(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent placeholder-gray-300"
                    placeholder='Ej: "Viene el día de las madres, lanzamos nueva línea de productos, hay feriado el 18 de mayo, queremos destacar el aniversario de la empresa..."'
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-400">{briefing.length} caracteres</p>
                    <button
                      onClick={generateGrid}
                      disabled={gridLoading || !briefing.trim()}
                      className="text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {gridLoading ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generando grilla…
                        </>
                      ) : grid ? 'Regenerar grilla' : 'Generar grilla con Claude'}
                    </button>
                  </div>
                </div>

                {gridError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                    {gridError}
                  </div>
                )}

                {grid && (
                  <>
                    {/* Resumen del mes */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-indigo-900 mb-1">
                            Plan de contenido — {grid.month_label}
                          </p>
                          <p className="text-sm text-indigo-700">{grid.briefing_summary}</p>
                          {grid.notes && (
                            <p className="text-xs text-indigo-500 mt-2 italic">{grid.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 flex-shrink-0">
                          {grid.monthly_themes.map(t => (
                            <span key={t} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tabla de grilla */}
                    <ContentGridTable grid={grid.grid} />
                  </>
                )}

                {!grid && !gridLoading && !gridError && (
                  <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
                    <p className="text-4xl mb-3">📅</p>
                    <p className="text-sm font-medium text-gray-700 mb-1">Sin grilla generada</p>
                    <p className="text-xs text-gray-400">
                      Escribe el briefing del mes arriba y haz clic en "Generar grilla con Claude"
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-300 text-right pb-4 mt-6">
          {data?.fetchedAt && `Actualizado: ${new Date(data.fetchedAt).toLocaleString('es-CL')}`}
        </p>
      </div>
    </div>
  )
}
