# Conexion a APIs de Plataformas

## Fetchers

Cada plataforma tiene su fetcher en `src/lib/fetchers/`:

| Archivo | Plataforma | Notas |
|---------|-----------|-------|
| `googleAds.ts` | Google Ads | Usa micros (dividir por 1.000.000) |
| `metaAds.ts` | Meta Marketing API | Token 60 dias, renovar |
| `tiktokAds.ts` | TikTok Business API | Token en header |
| `linkedinAds.ts` | LinkedIn Marketing API | Token 60 dias |

## Modo sin credenciales

Si `NODE_ENV === 'development'` y no hay variables de entorno, todos los fetchers retornan mock data automaticamente desde `src/lib/mock/dashboardMock.ts`.

## API Route unificada

`src/app/api/dashboard/route.ts` — Agrega todas las plataformas en paralelo con `Promise.allSettled`. Si una falla, las demas continuan.

## Rate Limits

Ver `src/config/rateLimits.ts`
