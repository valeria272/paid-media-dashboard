# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripcion

Dashboard de monitoreo de campanas paid media para Grupo CopyLab / CopyWriters. Conecta Google Ads y Meta Ads con datos reales, compara vs mes anterior, trackea visitas web via GA4, y alerta si el gasto se va a pasar del presupuesto aprobado.

**Produccion:** https://paid-media-dashboard-delta.vercel.app
**Vista cliente:** https://paid-media-dashboard-delta.vercel.app/client

## Comandos

```bash
npm run dev       # servidor local
npm run build     # build de produccion (incluye NODE_OPTIONS para google-ads-api)
npx vercel --prod --yes  # deploy a produccion (no hay CLI instalado globalmente)
```

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Recharts (graficos), SWR (polling cada 10 min), Zustand (estado global)
- `google-ads-api` libreria oficial Node.js — pesada, por eso NODE_OPTIONS en build
- Deploy en Vercel, proyecto `paid-media-dashboard` bajo cuenta `valeria-1724`

## Plataformas conectadas

| Servicio | Detalle |
|---|---|
| **Google Ads** | Search AO — Customer ID 6992389876, MCC 5146261547 |
| **Meta Ads** | Account act_1149308125905123, Pagina 104484357562306 |
| **GA4** | Property 401462519 — cubre copywriters.cl y asesorias.copywriters.cl |
| **Google Sheets** | Presupuestos aprobados — Sheet ID 1w5QEJc6MhxH4wLGvKNFJO_0oJ-HKhuEPjXfrpgKOy7g |
| **Slack** | Bot "asistente" (U0AQX9T3CHZ), canal #registro-campanas-gcl (C0ARWD3BLQN) |

## Arquitectura de datos

Cada request del frontend hace polling via SWR a las API routes. Las API routes llaman a los fetchers que consultan las APIs externas. No hay base de datos — todo se obtiene en tiempo real.

```
Frontend (SWR polling)
  └── /api/dashboard      → googleAds.ts + metaAds.ts + budgetSheet.ts
  └── /api/alerts         → detectAlerts.ts (usa datos del dashboard)
  └── /api/analytics      → analytics.ts → GA4 Data API (copywriters.cl)
  └── /api/analytics/asesorias → analytics.ts → GA4 filtrado por hostname
  └── /api/notify         → notifications.ts → Slack Bot
  └── /api/cron/weekly    → crons automaticos (protegido con CRON_SECRET)
  └── /api/approvals      → CRUD en memoria (no persiste entre deploys)
```

**GA4 — separacion de dominios:** `analytics.ts` usa `ASESORIAS_FILTER` (hostname = asesorias.copywriters.cl) para separar metricas. Ambos dominios comparten la property 401462519 y el Measurement ID G-0HSFLFM44X. Cross-domain linking configurado en GA4 y en gtag.

## Reglas criticas

### SOLO campanas activas
- NUNCA analizar campanas pausadas, desactivadas o terminadas
- Campanas con 0 impresiones Y 0 gasto se excluyen aunque esten ENABLED
- Google GAQL: usar `metrics.cost_micros > 0`, NO `campaign.status = 'ENABLED'` como filtro
- Meta: `effective_status = 'ACTIVE'`

### SOLO plataformas que usa CopyWriters
- Solo Google Ads y Meta Ads — no agregar TikTok, LinkedIn ni datos mock
- Si se agrega una plataforma nueva, habilitarla explicitamente con la usuaria

### Moneda CLP
- SIEMPRE formatear: `$5.000`, `$1.500.000` — usar `formatCLP()` de `lib/format/currency.ts`
- NUNCA decimales en montos CLP

### Meta Ads API — Presupuestos
- CLP NO tiene centavos — el valor en la API es DIRECTO (NO multiplicar por 100)
- Presupuestos SIEMPRE como `lifetime_budget` mensual con `start_time` y `end_time` (30 dias)
- NUNCA activar campanas automaticamente — dejar en PAUSED para revision del PM
- NUNCA modificar campanas que la usuaria ya configuro manualmente
- Al crear ad sets: Advantage+ Audience y todas las ubicaciones por defecto

### Alertas
- Comparar **gasto promedio diario** vs presupuesto diario — NUNCA acumulado vs diario
- `detectAlerts()` siempre recibe `periodDays` como parametro
- Umbrales de "sin conversiones" se ajustan por dias del periodo

### Aprobacion humana
- NUNCA ejecutar cambios en campanas sin aprobacion del Paid Media Specialist
- Cambios propuestos van a `/approvals` + notificacion Slack

### Datos del periodo
- Default: mes actual (1ro a hoy) vs mismo periodo del mes anterior
- El periodo anterior es siempre la misma cantidad de dias antes del rango seleccionado

## Tokens y credenciales

- **Google** refresh token scopes: `adwords` + `analytics.readonly` + `spreadsheets.readonly`
  - Para regenerar: `python3 generate_token.py` (abre navegador)
  - Si da "invalid_client" en Vercel: borrar y recrear la env var con `printf` (sin newlines)
- **Meta** token long-lived (60 dias), auto-renovacion en `metaTokenRefresh.ts` cada 24h
  - Token expira ~junio 2026 — verificar antes de esa fecha
- **Pixel Meta:** GCL 2025-2026 (242693976884672) — compartido entre ambos dominios

## Crons automaticos (Vercel)

| Hora CLT | Endpoint | Accion |
|---|---|---|
| Mar 9:00 | `/api/cron/weekly` | Alertas + sugerencias pre-recap |
| Jue 8:00 | `/api/notify` | Reminder confirmacion PM |
| Jue 10:00 | `/api/notify` | Client recap formato A |
| Lun/Mie/Vie 9:00 | `/api/cron/weekly` | Monitoreo todas las campanas |

Todos los endpoints de cron estan protegidos con `CRON_SECRET`.

## Campana Meta — Asesorias (activa desde abr 2026)

- Campana: GCL | Asesoría Digital | Leads (ID: 120245026001540319)
- AdSet: Asesoría Digital | Chile | Advantage+ | Mensual (ID: 120245026321810319)
- Presupuesto: $100.000 CLP lifetime (10 abr - 9 may 2026)
- Pixel evento: Lead — solo en asesorias.copywriters.cl
- Conversion en GA4: evento `generate_lead` (marcado como evento clave)
