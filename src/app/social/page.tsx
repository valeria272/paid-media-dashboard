'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { Sidebar } from '@/components/layout/Sidebar'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import type { InstagramData, InstagramPost } from '@/lib/fetchers/instagram'
import type { BenchmarkProfile } from '@/lib/fetchers/instagramBenchmark'
import type { HooksResponse } from '@/app/api/instagram/hooks/route'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PERIOD_OPTIONS = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
]

const TYPE_COLORS: Record<string, string> = {
  Reel: '#6366f1',
  Carrusel: '#f59e0b',
  Foto: '#10b981',
}

// ── Componentes reutilizables ────────────────────────────

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border shadow-sm ${highlight ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-700 mb-4">{children}</h2>
}

function PostCard({ post, showEngagement = false }: { post: InstagramPost; showEngagement?: boolean }) {
  const date = new Date(post.timestamp).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  const caption = post.caption ? post.caption.slice(0, 90) + (post.caption.length > 90 ? '…' : '') : ''
  const thumb = post.thumbnail_url || post.media_url
  const typeLabel = post.media_type === 'VIDEO' ? 'Reel' : post.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Foto'
  const typeColor = TYPE_COLORS[typeLabel] || '#6366f1'

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group block"
    >
      <div className="relative aspect-square bg-gray-100">
        {thumb && (
          <Image
            src={thumb}
            alt={caption || 'Post'}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 200px"
            unoptimized
          />
        )}
        <div className="absolute top-2 right-2">
          <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: typeColor }}>
            {typeLabel}
          </span>
        </div>
        {post.shares != null && post.shares > 0 && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            ↗ {post.shares.toLocaleString('es-CL')}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-1">{date}</p>
        {caption && <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">{caption}</p>}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <span>♥ {post.like_count.toLocaleString('es-CL')}</span>
          <span>💬 {post.comments_count.toLocaleString('es-CL')}</span>
          {post.reach != null && <span>👁 {post.reach.toLocaleString('es-CL')}</span>}
          {post.saved != null && post.saved > 0 && <span>🔖 {post.saved.toLocaleString('es-CL')}</span>}
        </div>
        {showEngagement && post.engagement_rate != null && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <span className="text-xs font-medium text-indigo-600">ER: {post.engagement_rate}%</span>
          </div>
        )}
      </div>
    </a>
  )
}

function TokenWarning({ expiresAt }: { expiresAt?: number }) {
  if (!expiresAt) return null
  const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft > 14) return null

  return (
    <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium flex items-center gap-2 ${
      daysLeft <= 7 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    }`}>
      <span>{daysLeft <= 7 ? '🔴' : '🟡'}</span>
      Token de Instagram vence en <strong>{daysLeft} días</strong> — renovar antes del{' '}
      {new Date(expiresAt * 1000).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.
    </div>
  )
}

function exportCSV(posts: InstagramPost[]) {
  const headers = ['Fecha', 'Tipo', 'Likes', 'Comentarios', 'Alcance', 'Guardados', 'Shares', 'ER%', 'Caption', 'URL']
  const rows = posts.map(p => [
    p.timestamp.slice(0, 10),
    p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Foto',
    p.like_count,
    p.comments_count,
    p.reach ?? '',
    p.saved ?? '',
    p.shares ?? '',
    p.engagement_rate ?? '',
    `"${(p.caption || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    p.permalink,
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `instagram_posts_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Benchmark card ───────────────────────────────────────

function BenchmarkCard({ account }: { account: BenchmarkProfile }) {
  const typeColor: Record<string, string> = {
    Reels: '#6366f1', Carrusel: '#f59e0b', Foto: '#10b981', Mix: '#6b7280',
  }
  const erVsCopywriters = account.engagement_rate

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <a href={account.ig_url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
              @{account.username}
            </a>
            <p className="text-xs text-gray-400 mt-0.5">{account.category}</p>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
            {account.followers.toLocaleString('es-CL')} seg.
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div>
            <p className="text-xs text-gray-400">Avg likes</p>
            <p className="text-sm font-bold text-gray-800">{account.avg_likes.toLocaleString('es-CL')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Posts/sem.</p>
            <p className="text-sm font-bold text-gray-800">{account.posts_per_week}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ER%</p>
            <p className={`text-sm font-bold ${erVsCopywriters > 1.5 ? 'text-green-600' : 'text-gray-800'}`}>
              {account.engagement_rate}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
            style={{ backgroundColor: typeColor[account.best_content_type] || '#6b7280' }}>
            {account.best_content_type}
          </span>
          <a href={account.ig_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
            Ver perfil →
          </a>
        </div>

        {account.notes && (
          <p className="text-xs text-gray-400 mt-2 italic">{account.notes}</p>
        )}
        <p className="text-xs text-gray-300 mt-2">Actualizado: {account.last_updated}</p>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────

export default function SocialPage() {
  const [period, setPeriod] = useState(30)
  const [hooksLoading, setHooksLoading] = useState(false)
  const [hooks, setHooks] = useState<HooksResponse | null>(null)
  const [hooksError, setHooksError] = useState<string | null>(null)

  const { data, isLoading } = useSWR<InstagramData>(
    `/api/instagram?period=${period}`,
    fetcher,
    { refreshInterval: 10 * 60 * 1000 }
  )

  const { data: benchmark, isLoading: benchmarkLoading } = useSWR<BenchmarkProfile[]>(
    '/api/instagram/benchmark',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30 * 60 * 1000 }
  )

  const generateHooks = useCallback(async () => {
    if (!data) return
    setHooksLoading(true)
    setHooksError(null)
    try {
      const res = await fetch('/api/instagram/hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: data.posts, profile: data.profile }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setHooks(result)
    } catch (err) {
      setHooksError(err instanceof Error ? err.message : 'Error generando sugerencias')
    } finally {
      setHooksLoading(false)
    }
  }, [data])

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
          </div>
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-6 gap-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-52 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  if ('error' in data) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-red-500">{(data as { error: string }).error}</p>
        </div>
      </div>
    )
  }

  const { profile, posts, stories, insights } = data
  const topPosts = [...posts].sort((a, b) => (b.reach ?? b.like_count) - (a.reach ?? a.like_count))
  const topByEngagement = [...posts].sort((a, b) => (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0))
  const engagementRate = insights.follower_count > 0
    ? ((insights.total_interactions_7d / 7) / insights.follower_count * 100).toFixed(2)
    : '0.00'
  const bestHour = insights.best_hours[0]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8 max-w-7xl overflow-x-hidden">

        {/* Token warning */}
        <TokenWarning expiresAt={insights.token_expires_at} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {profile.profile_picture_url && (
              <Image src={profile.profile_picture_url} alt={profile.username} width={48} height={48}
                className="rounded-full border-2 border-indigo-200" unoptimized />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">@{profile.username}</h1>
              <p className="text-sm text-gray-500">{profile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-xs">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-3 py-2 font-medium transition-colors ${
                    period === opt.value ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => exportCSV(posts)}
              className="text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition-colors"
            >
              Exportar CSV
            </button>
            <LiveIndicator />
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <StatCard label="Seguidores" value={profile.followers_count} sub={`Siguiendo: ${profile.follows_count.toLocaleString('es-CL')}`} highlight />
          <StatCard label="Publicaciones" value={profile.media_count} />
          <StatCard label={`Alcance ${period}d`} value={insights.reach_30d} />
          <StatCard label="Alcance 7d" value={insights.reach_7d} />
          <StatCard label="ER diaria" value={`${engagementRate}%`} sub="interacciones / seguidores" />
        </div>

        {/* KPIs secundarios */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="Visitas al perfil (7d)" value={insights.profile_views_7d} />
          <StatCard label="Cuentas interactuaron (7d)" value={insights.accounts_engaged_7d} />
          <StatCard label="Interacciones totales (7d)" value={insights.total_interactions_7d} />
          <StatCard label="Views stories (7d)" value={insights.stories_views_7d} sub="incluye posts y reels" />
          <StatCard label="Respuestas stories (7d)" value={insights.stories_replies_7d} />
        </div>

        {/* Stories activas */}
        {stories.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Stories activas ahora</SectionTitle>
              <span className="text-xs text-gray-400">{stories.length} historia{stories.length !== 1 ? 's' : ''} vigente{stories.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stories.map(story => (
                <div key={story.id} className="flex-shrink-0 w-28 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="relative bg-gray-900" style={{ aspectRatio: '9/16', height: 180 }}>
                    {story.media_url && (
                      <Image src={story.media_url} alt="Story" fill className="object-cover" sizes="112px" unoptimized />
                    )}
                    {!story.media_url && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">Story</div>
                    )}
                  </div>
                  <div className="p-2 space-y-0.5 text-xs text-gray-500">
                    {story.reach != null && <p>👁 {story.reach.toLocaleString('es-CL')}</p>}
                    {story.exits != null && story.exits > 0 && <p>↩ {story.exits} exits</p>}
                    {story.replies != null && story.replies > 0 && <p>💬 {story.replies} resp.</p>}
                    {story.taps_forward != null && story.taps_forward > 0 && <p>→ {story.taps_forward} fwd</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gráfico alcance + breakdown por tipo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Alcance diario — últimos {period} días</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={insights.reach_series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={d => { const [,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}` }}
                  tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={Math.floor(insights.reach_series.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip formatter={(v) => [Number(v).toLocaleString('es-CL'), 'Alcance']}
                  labelFormatter={d => { const [y,m,day] = d.split('-'); return `${parseInt(day)}/${parseInt(m)}/${y}` }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#reachGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Rendimiento por tipo</SectionTitle>
            {insights.by_type.length === 0 ? (
              <p className="text-xs text-gray-400">Sin datos suficientes</p>
            ) : (
              <div className="space-y-4">
                {insights.by_type.map(t => (
                  <div key={t.type}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium" style={{ color: TYPE_COLORS[t.type] }}>{t.type}</span>
                      <span className="text-xs text-gray-400">{t.count} posts</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600">
                      <span>Alcance avg: <strong>{t.avg_reach.toLocaleString('es-CL')}</strong></span>
                      <span>ER avg: <strong>{t.avg_engagement}%</strong></span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (t.avg_reach / Math.max(...insights.by_type.map(x => x.avg_reach))) * 100)}%`, backgroundColor: TYPE_COLORS[t.type] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Demographics + Best hours */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Países */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Top países</SectionTitle>
            {insights.top_countries.length === 0 ? (
              <p className="text-xs text-gray-400">No disponible — requiere más datos</p>
            ) : (
              <div className="space-y-2">
                {insights.top_countries.map(c => (
                  <div key={c.value} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-8">{c.value}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${c.percentage}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edad */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Distribución por edad</SectionTitle>
            {insights.age_gender.length === 0 ? (
              <p className="text-xs text-gray-400">No disponible — requiere más datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={insights.age_gender} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="value" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Seguidores']} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                  <Bar dataKey="percentage" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Mejor hora */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Mejor hora para publicar</SectionTitle>
            {insights.best_hours.length === 0 ? (
              <p className="text-xs text-gray-400">Sin datos suficientes</p>
            ) : (
              <>
                <div className="text-center mb-3">
                  <p className="text-3xl font-bold text-indigo-600">
                    {bestHour.hour}:00{bestHour.hour < 12 ? ' AM' : ' PM'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">ER promedio: {bestHour.avg_engagement}%</p>
                </div>
                <div className="space-y-1">
                  {insights.best_hours.slice(0, 4).map(h => (
                    <div key={h.hour} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 w-12">{h.hour}:00h</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${(h.avg_engagement / bestHour.avg_engagement) * 100}%` }} />
                      </div>
                      <span className="text-gray-400 w-10 text-right">{h.avg_engagement}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mejores posts por alcance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Mejores posts — por alcance</SectionTitle>
            <a href="https://www.instagram.com/copywriters.cl" target="_blank" rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:underline">Ver en Instagram</a>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {topPosts.slice(0, 12).map(post => <PostCard key={post.id} post={post} />)}
          </div>
        </div>

        {/* Top por engagement */}
        <div className="mb-6">
          <SectionTitle>Mejores posts — por engagement rate</SectionTitle>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {topByEngagement.slice(0, 6).map(post => <PostCard key={post.id} post={post} showEngagement />)}
          </div>
        </div>

        {/* Benchmark */}
        <div className="mb-6">
          <SectionTitle>Benchmark — competidores y referentes</SectionTitle>
          {benchmarkLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(benchmark || []).map(account => <BenchmarkCard key={account.username} account={account} />)}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Edita la lista en <code className="bg-gray-100 px-1 rounded">src/config/instagramBenchmark.ts</code>
          </p>
        </div>

        {/* Hooks y sugerencias IA */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Hooks y contenido — sugerencias con IA</SectionTitle>
            <button
              onClick={generateHooks}
              disabled={hooksLoading}
              className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {hooksLoading ? 'Generando…' : hooks ? 'Regenerar' : 'Generar con Claude'}
            </button>
          </div>

          {hooksError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 mb-4">
              {hooksError.includes('ANTHROPIC_API_KEY') ? (
                <>Agrega tu <code className="bg-red-100 px-1 rounded">ANTHROPIC_API_KEY</code> en .env.local para activar esta función.</>
              ) : hooksError}
            </div>
          )}

          {!hooks && !hooksError && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-gray-400 text-sm">
              Haz clic en "Generar con Claude" para obtener hooks y sugerencias basadas en tus mejores posts.
            </div>
          )}

          {hooks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hooks */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Hooks para Reels y captions</h3>
                <div className="space-y-3">
                  {hooks.hooks.map((h, i) => (
                    <div key={i} className="border-l-2 border-indigo-200 pl-3">
                      <p className="text-sm font-medium text-gray-900">"{h.hook}"</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full capitalize">{h.type}</span>
                        <span className="text-xs text-gray-400">{h.why}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ideas de contenido */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Ideas de contenido</h3>
                  <div className="space-y-3">
                    {hooks.content_ideas.map((idea, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap self-start mt-0.5"
                          style={{ backgroundColor: TYPE_COLORS[idea.format] + '20', color: TYPE_COLORS[idea.format] }}>
                          {idea.format}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{idea.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{idea.angle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Temas + best practices */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="text-xs font-semibold text-gray-600 mb-2">Temas que funcionan</h3>
                    <ul className="space-y-1">
                      {hooks.top_themes.map((t, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                          <span className="text-indigo-400 mt-0.5">•</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <h3 className="text-xs font-semibold text-gray-600 mb-2">Best practices</h3>
                    <ul className="space-y-1">
                      {hooks.best_practices.map((bp, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                          <span className="text-green-400 mt-0.5">✓</span> {bp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-right pb-4">
          Actualizado: {new Date(data.fetchedAt).toLocaleString('es-CL')}
        </p>
      </div>
    </div>
  )
}
