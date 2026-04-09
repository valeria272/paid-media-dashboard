# Paid Media Pro — Dashboard en Tiempo Real

## Descripcion

Dashboard de monitoreo de campanas paid media para Grupo CopyLab / CopyWriters. Conecta Google Ads y Meta Ads con datos reales, compara vs mes anterior, trackea visitas web via GA4, y alerta si el gasto se va a pasar del presupuesto aprobado.

**Produccion:** https://paid-media-dashboard-delta.vercel.app
**Vista cliente:** https://paid-media-dashboard-delta.vercel.app/client

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Recharts (graficos), SWR (polling), Zustand (estado), date-fns
- google-ads-api (libreria oficial Node.js para Google Ads)
- Deploy en Vercel — build requiere `NODE_OPTIONS='--max-old-space-size=4096'`

## Plataformas conectadas

| Servicio | Uso |
|---|---|
| **Google Ads** | Campanas Search AO — Customer ID 6992389876, MCC 5146261547 |
| **Meta Ads** | GCL Lead Ads — Account act_1149308125905123 |
| **GA4** | copywriters.cl + asesorias.copywriters.cl — Property 401462519 |
| **Google Sheets** | Presupuestos aprobados — Sheet "Simulacion presupuesto GCL" |
| **Slack** | Bot "asistente" en workspace Copywriters |

## Reglas criticas

### SOLO campanas activas
- NUNCA analizar campanas pausadas, desactivadas o terminadas
- Filtrar `status === 'active'` en fetchers, API routes, alertas, recaps
- Campanas con 0 impresiones Y 0 gasto se excluyen (habilitadas pero sin servir)
- Google: `campaign.status = 'ENABLED'`; Meta: `effective_status = 'ACTIVE'`

### SOLO plataformas que usa CopyWriters
- Solo Google Ads y Meta Ads — no incluir TikTok, LinkedIn, ni datos mock
- Si se agrega una plataforma nueva, habilitarla explicitamente

### Moneda CLP
- SIEMPRE formatear: `$5.000`, `$1.500.000`
- NUNCA decimales en montos CLP
- Usar `formatCLP()` de `lib/format/currency.ts`

### Alertas correctas
- Alertas de pacing: comparar **gasto promedio diario** vs presupuesto diario
- NUNCA comparar gasto acumulado del mes vs presupuesto diario
- `detectAlerts()` siempre recibe `periodDays` como parametro
- Umbrales de "sin conversiones" se ajustan por dias del periodo

### Aprobacion humana
- NUNCA ejecutar cambios en campanas sin aprobacion del Paid Media Specialist
- Cambios propuestos van a `/approvals` + notificacion Slack

### Datos del periodo
- Default: mes actual (1ro a hoy) comparado con mismo periodo del mes anterior
- Selector de fechas: Hoy, 7d, Mes actual, Mes anterior, 30d, Personalizado
- El periodo anterior siempre es la misma cantidad de dias antes del rango seleccionado

## Estructura

```
src/
  app/
    page.tsx                    # Dashboard interno (equipo)
    client/page.tsx             # Dashboard cliente (sin alertas/crisis)
    campaigns/page.tsx          # Tabla de campanas
    approvals/page.tsx          # Aprobaciones humanas
    api/
      dashboard/route.ts        # API principal — agrega todo + comparacion mensual
      alerts/route.ts           # Alertas de performance
      analytics/route.ts        # GA4 — visitas web
      approvals/route.ts        # CRUD aprobaciones
      recaps/route.ts           # Recap diario/semanal
      notify/route.ts           # Disparar notificaciones Slack
      slack/route.ts            # Envio manual a Slack
  lib/
    fetchers/
      googleAds.ts              # Google Ads API (libreria oficial)
      metaAds.ts                # Meta Marketing API + auto-renovacion token
      analytics.ts              # Google Analytics 4 Data API
      budgetSheet.ts            # Presupuestos desde Google Sheets
      metaTokenRefresh.ts       # Auto-renovacion token Meta (cada 24h)
    alerts/detectAlerts.ts      # Logica de deteccion (pacing, CPA, CTR, conversiones)
    slack/
      slackClient.ts            # Cliente Slack (Bot Token)
      notifications.ts          # Notificaciones: performance, budget, optimizacion, recap
    dates.ts                    # Helpers de rangos mensuales
    format/currency.ts          # formatCLP, formatPercent, etc
    types/index.ts              # Tipos TypeScript
  components/
    layout/DateRangePicker.tsx  # Selector de fechas con presets
    layout/Sidebar.tsx          # Solo Google + Meta + Aprobaciones
    layout/LiveIndicator.tsx    # Punto verde + timestamp
    metrics/                    # KpiCard, KpiCardGrid, PlatformTable, TrendBadge
    charts/SpendChart.tsx       # Grafico de area (Recharts)
    alerts/                     # AlertBanner, AlertList, AlertBadge
    approvals/ApprovalCard.tsx  # Tarjeta de aprobacion con review
```

## Tokens y credenciales

- Refresh token Google tiene scopes: `adwords` + `analytics.readonly` + `spreadsheets.readonly`
- Para regenerar: `python3 generate_token.py` (abre navegador, pide permisos)
- Meta token long-lived (60 dias), auto-renovacion en `metaTokenRefresh.ts`
- Si Google da "invalid_client" en Vercel: borrar y recrear la env var con `printf` (sin newlines)

## Pendientes

- [ ] Slack: agregar SLACK_BOT_TOKEN y SLACK_USER_ID a Vercel env vars
- [ ] Definir canal de Slack para alertas (actualmente DM a Vale)
- [ ] Programar cron para recap semanal automatico
- [ ] Probar flujo completo de notificaciones Slack en produccion
