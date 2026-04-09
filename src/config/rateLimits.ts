// ═══ Rate limits por plataforma ═══

export const RATE_LIMITS = {
  googleAds: {
    requestsPerDay: 15000,
    minIntervalMs: 60000,
    recommendedIntervalMs: 300000,
  },
  metaAds: {
    requestsPerHour: 200,
    minIntervalMs: 60000,
    recommendedIntervalMs: 300000,
  },
  tiktokAds: {
    requestsPerDay: 1000,
    minIntervalMs: 120000,
    recommendedIntervalMs: 600000,
  },
  linkedinAds: {
    requestsPerDay: 100,
    minIntervalMs: 300000,
    recommendedIntervalMs: 900000,
  },
}
