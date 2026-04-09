import { Platform } from '@/lib/types'

export interface PlatformConfig {
  id: Platform
  name: string
  icon: string
  color: string
  enabled: boolean
}

export const PLATFORMS: PlatformConfig[] = [
  { id: 'google', name: 'Google Ads', icon: '🔵', color: '#4285F4', enabled: true },
  { id: 'meta', name: 'Meta Ads', icon: '🟣', color: '#0668E1', enabled: true },
  { id: 'tiktok', name: 'TikTok Ads', icon: '⚫', color: '#000000', enabled: true },
  { id: 'linkedin', name: 'LinkedIn Ads', icon: '🔷', color: '#0A66C2', enabled: true },
]

export const PLATFORM_LABELS: Record<string, string> = {
  google: '🔵 Google Ads',
  meta: '🟣 Meta Ads',
  tiktok: '⚫ TikTok Ads',
  linkedin: '🔷 LinkedIn Ads',
}
