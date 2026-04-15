// ═══ Benchmark de competidores Instagram ═══
// Datos actualizables manualmente. La API de business_discovery de Meta
// requiere App Review para funcionar — esta config es la alternativa confiable.
// Actualiza los números mensualmente con datos reales de cada perfil.

export interface BenchmarkAccount {
  username: string
  label: string
  category: string
  followers: number          // actualizar manualmente
  avg_likes: number          // promedio de likes en últimos 9 posts
  avg_comments: number
  posts_per_week: number
  best_content_type: 'Reels' | 'Carrusel' | 'Foto' | 'Mix'
  top_post_url?: string       // URL de su mejor post reciente
  top_post_thumbnail?: string // imagen representativa (opcional)
  notes?: string
  last_updated: string        // fecha de última actualización manual
}

export const BENCHMARK_ACCOUNTS: BenchmarkAccount[] = [
  // ── Agencias digitales Chile ──────────────────────────────
  {
    username: 'brain.agency',
    label: 'Brain Agency',
    category: 'Agencia CL',
    followers: 12500,
    avg_likes: 180,
    avg_comments: 8,
    posts_per_week: 4,
    best_content_type: 'Reels',
    top_post_url: 'https://www.instagram.com/brain.agency/',
    notes: 'Foco en diseño y branding',
    last_updated: '2026-04-14',
  },
  {
    username: 'agenciajelly',
    label: 'Jelly Agency',
    category: 'Agencia CL',
    followers: 8200,
    avg_likes: 95,
    avg_comments: 5,
    posts_per_week: 3,
    best_content_type: 'Carrusel',
    top_post_url: 'https://www.instagram.com/agenciajelly/',
    last_updated: '2026-04-14',
  },
  {
    username: 'rompecabezaschile',
    label: 'Rompecabezas',
    category: 'Agencia CL',
    followers: 6800,
    avg_likes: 70,
    avg_comments: 4,
    posts_per_week: 2,
    best_content_type: 'Mix',
    top_post_url: 'https://www.instagram.com/rompecabezaschile/',
    last_updated: '2026-04-14',
  },

  // ── Referentes LATAM ─────────────────────────────────────
  {
    username: 'hotmart',
    label: 'Hotmart',
    category: 'Referente LATAM',
    followers: 420000,
    avg_likes: 1200,
    avg_comments: 45,
    posts_per_week: 7,
    best_content_type: 'Reels',
    top_post_url: 'https://www.instagram.com/hotmart/',
    notes: 'Benchmark de contenido educativo',
    last_updated: '2026-04-14',
  },
  {
    username: 'rockcontent',
    label: 'Rock Content',
    category: 'Referente LATAM',
    followers: 185000,
    avg_likes: 650,
    avg_comments: 20,
    posts_per_week: 5,
    best_content_type: 'Carrusel',
    top_post_url: 'https://www.instagram.com/rockcontent/',
    notes: 'Referente en content marketing',
    last_updated: '2026-04-14',
  },

  // ── Agrega competidores directos acá ─────────────────────
  // {
  //   username: 'competidor_cl',
  //   label: 'Nombre Competidor',
  //   category: 'Competidor directo',
  //   followers: 5000,
  //   avg_likes: 80,
  //   avg_comments: 3,
  //   posts_per_week: 3,
  //   best_content_type: 'Reels',
  //   top_post_url: 'https://www.instagram.com/competidor_cl/',
  //   last_updated: '2026-04-14',
  // },
]
