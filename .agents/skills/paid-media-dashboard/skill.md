---
name: paid-media-dashboard
description: Next.js 16 App Router dashboard for Google Ads + Meta Ads monitoring — Grupo CopyLab. Covers API route architecture, Google Ads GAQL queries, Meta Ads API, GA4 Data API, SWR polling, CLP formatting, budget alerting, Vercel deployment, and critical data rules. Triggers when modifying API routes, fetchers, dashboard components, alert logic, or deploying.
---

# Paid Media Dashboard — CopyLab (Next.js + Vercel)

**Producción:** https://paid-media-dashboard-delta.vercel.app
**Cliente:** https://paid-media-dashboard-delta.vercel.app/client

## Stack

```
Next.js 16 (App Router) + TypeScript + Tailwind CSS
Recharts (gráficos) · SWR (polling cada 10 min) · Zustand (estado global)
google-ads-api (Node.js) · Meta Graph API · GA4 Data API
Vercel (deploy) — proyecto: paid-media-dashboard, cuenta: valeria-1724
```

## Arquitectura de Datos

No hay base de datos — todo es tiempo real:

```
Frontend (SWR polling 10min)
  └── /api/dashboard      → googleAds.ts + metaAds.ts + budgetSheet.ts
  └── /api/alerts         → detectAlerts.ts (recibe datos del dashboard)
  └── /api/analytics      → analytics.ts → GA4 copywriters.cl
  └── /api/analytics/asesorias → analytics.ts filtrado por hostname
  └── /api/notify         → notifications.ts → Slack Bot
  └── /api/cron/weekly    → cron protegido con CRON_SECRET
  └── /api/approvals      → CRUD en memoria (no persiste entre deploys)
```

## Plataformas Conectadas

| Servicio | IDs clave |
|---|---|
| Google Ads | Customer ID: 6992389876, MCC: 5146261547 |
| Meta Ads | Account: act_1149308125905123, Página: 104484357562306 |
| GA4 | Property: 401462519 (copywriters.cl + asesorias.copywriters.cl) |
| Google Sheets | Sheet ID: 1w5QEJc6MhxH4wLGvKNFJO_0oJ-HKhuEPjXfrpgKOy7g (presupuestos) |
| Slack | Bot: U0AQX9T3CHZ, Canal: #registro-campanas-gcl (C0ARWD3BLQN) |

## Reglas Críticas de Datos

### Solo campañas activas con gasto real
```javascript
// Google Ads — CORRECTO
WHERE metrics.cost_micros > 0

// Google Ads — INCORRECTO (incluye campañas sin gasto)
WHERE campaign.status = 'ENABLED'

// Meta Ads
effective_status = 'ACTIVE'
```

### Solo plataformas de CopyLab
- Solo Google Ads y Meta Ads — **no agregar TikTok, LinkedIn ni datos mock**
- Nueva plataforma solo con habilitación explícita de Valeria

### Moneda CLP — Formateo
```typescript
// SIEMPRE usar formatCLP() de lib/format/currency.ts
formatCLP(5000)      // → "$5.000"
formatCLP(1500000)   // → "$1.500.000"

// NUNCA decimales en montos CLP
// NUNCA mostrar USD sin conversión
```

### Meta Ads — Presupuestos
- CLP no tiene centavos → valor en API es DIRECTO (NO multiplicar por 100)
- Presupuestos siempre como `lifetime_budget` mensual con `start_time` y `end_time` (30 días)
- **NUNCA activar campañas automáticamente** — dejar en PAUSED para revisión del PM
- **NUNCA modificar** campañas que Valeria configuró manualmente

## Lógica de Alertas

```typescript
// detectAlerts() siempre recibe periodDays como parámetro
function detectAlerts(data: DashboardData, periodDays: number): Alert[]

// Comparar SIEMPRE gasto promedio diario vs presupuesto diario
// NUNCA comparar acumulado vs diario
const gastoDiarioPromedio = gastoTotal / periodDays;
const presupuestoDiario = presupuestoMensual / 30;
const porcentaje = gastoDiarioPromedio / presupuestoDiario;

// Umbrales de "sin conversiones" se ajustan por días del período
```

## GA4 — Separación de Dominios

Ambos dominios comparten la property 401462519 y Measurement ID G-0HSFLFM44X:

```typescript
// analytics.ts — filtrar por hostname
const ASESORIAS_FILTER = { hostname: "asesorias.copywriters.cl" };
const MAIN_FILTER      = { hostname: "copywriters.cl" };
// Cross-domain linking configurado en GA4 y en gtag
```

## Comandos de Desarrollo y Deploy

```bash
npm run dev       # servidor local
npm run build     # incluye NODE_OPTIONS para google-ads-api (librería pesada)
npx vercel --prod --yes  # deploy a producción (no hay CLI instalado globalmente)
```

> **Nota google-ads-api:** Es una librería pesada de Node.js. El script de build incluye `NODE_OPTIONS` necesarios para que compile en Vercel. No cambiar esta configuración.

## Patrones de Código Frecuentes

### SWR polling con revalidación
```typescript
const { data, error } = useSWR('/api/dashboard', fetcher, {
  refreshInterval: 10 * 60 * 1000,  // 10 minutos
  revalidateOnFocus: false,
});
```

### Formateo consistente de fechas y montos
```typescript
import { formatCLP } from '@/lib/format/currency';
import { formatDate } from '@/lib/format/date';
// Siempre usar estas funciones — nunca formatear inline
```

## Estructura de Archivos Clave

```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/route.ts    ← endpoint principal
│   │   ├── alerts/route.ts
│   │   ├── analytics/route.ts
│   │   └── cron/weekly/route.ts
│   ├── page.tsx                  ← dashboard interno
│   └── client/page.tsx           ← vista cliente
├── lib/
│   ├── googleAds.ts             ← GAQL queries
│   ├── metaAds.ts               ← Meta Graph API
│   ├── analytics.ts             ← GA4 Data API
│   ├── budgetSheet.ts           ← Google Sheets presupuestos
│   ├── detectAlerts.ts          ← lógica de alertas
│   ├── notifications.ts         ← Slack
│   └── format/
│       ├── currency.ts          ← formatCLP() — usar siempre
│       └── date.ts
```

## Lo Que NUNCA Debe Suceder

- Analizar campañas pausadas, desactivadas o terminadas
- Activar campañas automáticamente (dejar en PAUSED)
- Modificar campañas que Valeria configuró manualmente
- Mostrar montos en USD sin convertir a CLP con `formatCLP()`
- Comparar gasto acumulado vs presupuesto diario en alertas
- Agregar plataformas no autorizadas (TikTok, LinkedIn, etc.)
