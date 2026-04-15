// ═══ Mapeo clientes → cuentas publicitarias ═══
// Nombres exactos tal como aparecen en la columna "Cliente" de la planilla de pacing
//
// Convenciones:
//  - googleAdsId: Customer ID sin guiones (ej: "1234567890")
//  - metaAdAccountId: sin "act_" (ej: "1149308125905123")
//  - tiktokAdvertiserId: Advertiser ID completo
//  - googleCampaignFilter: texto para LIKE — filtra campañas por nombre dentro de una cuenta compartida

export interface PacingClient {
  /** Nombre exacto como aparece en la columna "Cliente" de la planilla */
  name: string
  googleAdsId?: string
  /** Si la cuenta Google Ads es compartida entre clientes, filtrar campañas por nombre (LIKE) */
  googleCampaignFilter?: string
  metaAdAccountId?: string
  /** Si la cuenta Meta Ads es compartida entre clientes, filtrar campañas por nombre (contains) */
  metaCampaignFilter?: string
  /** TikTok Advertiser ID — pendiente hasta tener acceso a la Marketing API */
  tiktokAdvertiserId?: string
}

export const PACING_CLIENTS: PacingClient[] = [

  // ── Grupo CW (Agencia Copywriters BM) ─────────────────────────────────────
  {
    name: 'PRT',
    googleAdsId: '6848547798',      // cuenta SGS
  },
  {
    name: 'ETFA',
    // IDs pendientes — sin cuenta activa por ahora
  },
  {
    name: 'MÁS CENTER',
    metaAdAccountId: '523272021711752',   // "Cuenta Publicitarias MÁS CENTER"
  },
  {
    name: 'FORK',
    googleAdsId: '8495018276',            // "Fork"
    metaAdAccountId: '526729447722043',   // "Fork Chile"
  },
  {
    name: 'INU',
    googleAdsId: '1078774394',            // "Nueva Urbe"
    metaAdAccountId: '688384735077513',   // "Inmobiliaria Nueva Urbe"
    tiktokAdvertiserId: 'PENDING',        // cuenta agencia 7213483582088626177
  },
  {
    name: 'SAN ESTEBAN',
    googleAdsId: '3214527923',            // cuenta REM (compartida)
    googleCampaignFilter: 'San Esteban', // filtra campañas tipo "San Esteban - 2026"
    metaAdAccountId: '333338609517304',   // cuenta REM en Meta (compartida)
    metaCampaignFilter: 'San Esteban',
    tiktokAdvertiserId: 'PENDING',        // cuenta agencia 7213483582088626177
  },
  {
    name: 'RENDIC',
    googleAdsId: '3214527923',            // cuenta REM (compartida)
    googleCampaignFilter: 'Rendic',      // filtra campañas tipo "Search- Rendic 2026"
    metaAdAccountId: '333338609517304',   // cuenta REM en Meta (compartida)
    metaCampaignFilter: 'Rendic',
    tiktokAdvertiserId: 'PENDING',        // cuenta agencia 7213483582088626177
  },
  {
    name: 'MyZoo',
    metaAdAccountId: '1918211068769581',  // "My Zoo Ads"
  },

  // ── Grupo ABAKOS 1 (ADMIN CW-2.0 / Ebema S.A. BM) ─────────────────────────
  {
    name: 'QB',
    googleAdsId: '5469048150',            // "QB - Gads"
    metaAdAccountId: '502722338407799',   // cuenta HILTON compartida
    metaCampaignFilter: 'QB',
  },
  {
    name: 'PISO 18',
    googleAdsId: '6657424860',            // "Piso 18"
    metaAdAccountId: '502722338407799',   // cuenta HILTON compartida
    metaCampaignFilter: 'Piso 18',
  },
  {
    name: 'HILTON',
    googleAdsId: '7043204127',            // "DB Hilton"
    metaAdAccountId: '502722338407799',   // "Cuenta HILTON (propiedad de Copywriters)"
    metaCampaignFilter: 'Hilton',
  },
  {
    name: 'BETWEEN',
    googleAdsId: '7396269456',            // "Between"
    metaAdAccountId: '502722338407799',   // cuenta HILTON compartida
    metaCampaignFilter: 'Between',
  },
  {
    name: 'EBEMA',
    googleAdsId: '3220380182',            // "EBEMA"
    metaAdAccountId: '823470930601959',   // "NUEVA CUENTA EBEMA 2026"
  },
  {
    name: 'WELEDA CHILE',
    googleAdsId: '1014435395',            // "Weleda Chile"
    metaAdAccountId: '1135123736602727',  // "Marketing Weleda Chile"
  },
  {
    name: 'WELEDA ARGENTINA',
    googleAdsId: '6241328631',            // "Weleda Argentina Ad Account"
    metaAdAccountId: '789819278284846',   // "Weleda Argentina Ad Account (CLP)"
  },
  {
    name: 'REVEX',
    googleAdsId: '5806164156',            // "Grupo Revex"
    googleCampaignFilter: 'Revex',
    metaAdAccountId: '891200525731857',   // "REVEX (Propiedad Copywriters)"
    metaCampaignFilter: 'Revex',
  },
  {
    name: 'CASABLANCA',
    googleAdsId: '5806164156',            // cuenta Grupo Revex compartida
    googleCampaignFilter: 'Casablanca',
    metaAdAccountId: '891200525731857',   // cuenta REVEX compartida
    metaCampaignFilter: 'Casablanca',
  },

  {
    name: 'CAVA',
    googleAdsId: '9259540113',            // "CAVA"
    metaAdAccountId: '388186543769701',   // "CAVA ecomm"
  },

  // ── Grupo ABAKOS 2 (Abakos SpA BM) ────────────────────────────────────────
  {
    name: 'JAPI JANE',
    googleAdsId: '7355146921',            // "Japi Jane"
    metaAdAccountId: '1472258750879094',  // "AtreveteconJane"
  },
  {
    name: 'ABAKOS',
    googleAdsId: '4504754627',            // "Abakos 2.0"
    metaAdAccountId: '292827382158469',   // "Abakos SpA"
    tiktokAdvertiserId: '7578918836096401424', // cuenta Abakos — confirmado
  },
  {
    name: 'SELFIE',
    metaAdAccountId: '559023099368352',   // "Selfie"
  },
  {
    name: 'DHEMAX',
    googleAdsId: '2525207691',      // "Dhemax"
  },
]

// Helper: buscar cliente por nombre (case-insensitive)
export function findPacingClient(name: string): PacingClient | undefined {
  const normalized = name.trim().toUpperCase()
  return PACING_CLIENTS.find(c => c.name.toUpperCase() === normalized)
}
