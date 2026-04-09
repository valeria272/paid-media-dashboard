// ═══ Auto-renovacion de token Meta ═══
// Los tokens long-lived duran 60 dias.
// Este modulo verifica si quedan menos de 7 dias y lo renueva automaticamente.

import fs from 'fs'
import path from 'path'

const TOKEN_CHECK_INTERVAL = 24 * 60 * 60 * 1000 // verificar cada 24h
let lastCheck = 0

export async function ensureValidMetaToken(): Promise<string> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return ''

  // Solo verificar una vez al dia
  if (Date.now() - lastCheck < TOKEN_CHECK_INTERVAL) return token
  lastCheck = Date.now()

  try {
    // Verificar expiracion del token actual
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`
    const debugRes = await fetch(debugUrl)
    const debugData = await debugRes.json()

    const expiresAt = debugData.data?.expires_at || 0
    if (expiresAt === 0) return token // token permanente

    const daysLeft = (expiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24)

    if (daysLeft > 7) {
      console.log(`[Meta Token] OK — ${Math.round(daysLeft)} dias restantes`)
      return token
    }

    console.warn(`[Meta Token] Quedan ${Math.round(daysLeft)} dias — renovando...`)

    // Renovar token
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) {
      console.error('[Meta Token] No se puede renovar: falta META_APP_ID o META_APP_SECRET')
      return token
    }

    const refreshUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`
    const refreshRes = await fetch(refreshUrl)
    const refreshData = await refreshRes.json()

    if (refreshData.access_token) {
      const newToken = refreshData.access_token
      console.log('[Meta Token] Renovado exitosamente — 60 dias mas')

      // Actualizar .env.local en disco
      try {
        const envPath = path.join(process.cwd(), '.env.local')
        let envContent = fs.readFileSync(envPath, 'utf-8')
        envContent = envContent.replace(
          /META_ACCESS_TOKEN=.+/,
          `META_ACCESS_TOKEN=${newToken}`
        )
        fs.writeFileSync(envPath, envContent)
        console.log('[Meta Token] .env.local actualizado')
      } catch {
        console.warn('[Meta Token] No se pudo actualizar .env.local — token renovado solo en memoria')
      }

      // Actualizar en memoria para esta sesion
      process.env.META_ACCESS_TOKEN = newToken
      return newToken
    }

    console.error('[Meta Token] Error renovando:', refreshData.error?.message)
    return token
  } catch (error) {
    console.error('[Meta Token] Error verificando:', error)
    return token
  }
}
