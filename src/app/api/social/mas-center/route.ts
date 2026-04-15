// ═══ API: Datos sociales orgánicos — Mas Center ═══
// GET /api/social/mas-center?platform=all|instagram|facebook|linkedin
//
// Retorna datos de todas las plataformas configuradas.
// Plataformas sin credenciales retornan { notConfigured: true }

import { NextResponse } from 'next/server'
import { fetchMasCenterInstagram } from '@/lib/fetchers/masCenterInstagram'
import { fetchMasCenterFacebook } from '@/lib/fetchers/masCenterFacebook'
import { fetchMasCenterLinkedin } from '@/lib/fetchers/masCenterLinkedin'

export const dynamic = 'force-dynamic'

function isConfigured(varNames: string[]): boolean {
  return varNames.every(v => !!process.env[v])
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform') || 'all'
  const period = Math.min(90, Math.max(7, Number(searchParams.get('period') || 30)))

  const results: Record<string, unknown> = {}

  // ── Instagram ────────────────────────────────────────────
  if (platform === 'all' || platform === 'instagram') {
    if (!isConfigured(['MAS_CENTER_IG_TOKEN', 'MAS_CENTER_IG_BUSINESS_ID'])) {
      results.instagram = {
        notConfigured: true,
        missingVars: ['MAS_CENTER_IG_TOKEN', 'MAS_CENTER_IG_BUSINESS_ID'],
        setupUrl: 'https://developers.facebook.com/docs/instagram-api/getting-started',
      }
    } else {
      try {
        results.instagram = await fetchMasCenterInstagram(period)
      } catch (err) {
        results.instagram = { error: err instanceof Error ? err.message : 'Error Instagram' }
      }
    }
  }

  // ── Facebook ─────────────────────────────────────────────
  if (platform === 'all' || platform === 'facebook') {
    if (!isConfigured(['MAS_CENTER_FB_TOKEN', 'MAS_CENTER_FB_PAGE_ID'])) {
      results.facebook = {
        notConfigured: true,
        missingVars: ['MAS_CENTER_FB_TOKEN', 'MAS_CENTER_FB_PAGE_ID'],
        setupUrl: 'https://developers.facebook.com/docs/pages/access-tokens',
      }
    } else {
      try {
        results.facebook = await fetchMasCenterFacebook()
      } catch (err) {
        results.facebook = { error: err instanceof Error ? err.message : 'Error Facebook' }
      }
    }
  }

  // ── LinkedIn ─────────────────────────────────────────────
  if (platform === 'all' || platform === 'linkedin') {
    if (!isConfigured(['MAS_CENTER_LI_TOKEN', 'MAS_CENTER_LI_ORG_ID'])) {
      results.linkedin = {
        notConfigured: true,
        missingVars: ['MAS_CENTER_LI_TOKEN', 'MAS_CENTER_LI_ORG_ID'],
        setupUrl: 'https://developer.linkedin.com/docs/oauth',
      }
    } else {
      try {
        results.linkedin = await fetchMasCenterLinkedin()
      } catch (err) {
        results.linkedin = { error: err instanceof Error ? err.message : 'Error LinkedIn' }
      }
    }
  }

  // ── TikTok (stub — pendiente de credenciales) ─────────────
  if (platform === 'all' || platform === 'tiktok') {
    if (!isConfigured(['MAS_CENTER_TT_TOKEN', 'MAS_CENTER_TT_OPEN_ID'])) {
      results.tiktok = {
        notConfigured: true,
        missingVars: ['MAS_CENTER_TT_TOKEN', 'MAS_CENTER_TT_OPEN_ID'],
        setupUrl: 'https://developers.tiktok.com/doc/login-kit-web',
      }
    } else {
      // TODO: implementar fetchMasCenterTiktok cuando se agreguen credenciales
      results.tiktok = { notConfigured: false, comingSoon: true }
    }
  }

  return NextResponse.json({
    ...results,
    fetchedAt: new Date().toISOString(),
  })
}
