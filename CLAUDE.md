# Paid Media Pro — Dashboard en Tiempo Real

## Descripcion del Proyecto

Dashboard de monitoreo y optimizacion de campanas de paid media multicanal (Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads). Visualiza metricas en tiempo real, detecta alertas automaticas, envia notificaciones a Slack, genera recaps diarios, y requiere aprobacion humana antes de ejecutar cualquier cambio.

## Stack Tecnologico

- **Framework:** Next.js 14 (App Router)
- **UI:** React + Tailwind CSS
- **Graficos:** Recharts
- **Actualizacion:** SWR (polling cada 5 minutos)
- **Estado global:** Zustand
- **Fechas:** date-fns
- **Lenguaje:** TypeScript estricto

## Reglas Criticas

### Moneda CLP
- SIEMPRE formatear: `$5.000`, `$1.500.000`
- NUNCA decimales en montos CLP
- NUNCA coma como separador de miles
- Usar `formatCLP()` de `lib/format/currency.ts` para todo monto

### Aprobacion Humana Obligatoria
- **NUNCA** ejecutar cambios en campanas sin aprobacion del Paid Media Specialist
- Todos los cambios propuestos van al sistema de aprobaciones (`/approvals`)
- Se notifica por Slack con botones de Aprobar/Rechazar
- Solo despues de aprobacion se ejecuta el cambio
- Las aprobaciones pendientes expiran a las 24 horas

### SOLO Campanas Activas
- **NUNCA** analizar campanas pausadas, desactivadas o terminadas
- Filtrar por status === 'active' en TODOS los puntos: fetchers, API routes, alertas, recaps, summary, comparacion con planilla
- Los fetchers filtran desde la fuente (Google: ENABLED+SERVING, Meta: effective_status ACTIVE, TikTok: CAMPAIGN_STATUS_ENABLE)
- Las API routes aplican filtro adicional de seguridad antes de procesar
- Analizar campanas inactivas genera alertas falsas y contamina metricas

### Solo Lectura por Defecto
- Este dashboard es de **VISUALIZACION** — no modifica campanas directamente
- Las optimizaciones se proponen como solicitudes de aprobacion
- El Paid Media Specialist revisa y aprueba antes de cualquier ejecucion

### Datos en Tiempo Real
- Polling cada 5 minutos (configurable via `NEXT_PUBLIC_REFRESH_INTERVAL`)
- SIEMPRE mostrar timestamp de ultima actualizacion
- Indicador visual live/offline
- Si una plataforma falla, el dashboard continua con las demas (graceful degradation)

### Rate Limits
- Google Ads: minimo 1 min entre requests, recomendado 5 min
- Meta Ads: max 200 req/hora, recomendado 5 min
- TikTok Ads: max 1000 req/dia, recomendado 10 min
- LinkedIn Ads: max 100 req/dia, recomendado 15 min

## Estructura del Proyecto

```
src/
  app/                    # Pages y API routes (Next.js App Router)
    api/
      dashboard/          # API unificada — agrega todas las plataformas
      alerts/             # Deteccion de alertas
      approvals/          # Sistema de aprobaciones humanas
      recaps/             # Generador de recaps diarios
      slack/              # Envio manual de alertas a Slack
  components/
    layout/               # Sidebar, Header, LiveIndicator
    metrics/              # KpiCard, KpiCardGrid, TrendBadge, PlatformTable
    charts/               # SpendChart, graficos
    alerts/               # AlertBanner, AlertList, AlertBadge
    approvals/            # ApprovalCard
  lib/
    fetchers/             # Conexion a APIs (Google, Meta, TikTok, LinkedIn)
    alerts/               # Logica de deteccion de alertas
    slack/                # Integracion Slack (webhooks)
    sheets/               # Conexion a Google Sheets (planilla de medios)
    approvals/            # Store de aprobaciones
    recaps/               # Generador de recaps
    format/               # Formateo CLP y helpers
    types/                # Tipos TypeScript compartidos
    mock/                 # Datos mock para desarrollo
  hooks/                  # useDashboardData, useAlerts, useApprovals
  store/                  # Zustand store
  config/                 # KPIs, rate limits, plataformas
```

## Flujo de Alertas

1. Cada 5 min se consultan las APIs de todas las plataformas
2. `detectAlerts()` evalua cada campana contra los KPI targets
3. Alertas se clasifican: **critical** > **warning** > **opportunity**
4. Alertas criticas se envian automaticamente a Slack
5. Dashboard muestra banner rojo + lista de alertas

### Tipos de Alerta
- **Critica:** Sobregasto >120%, CPA >2x objetivo, sin conversiones con gasto alto, pacing <50% despues de mediodia
- **Advertencia:** CTR bajo, CPA 20-100% sobre objetivo
- **Oportunidad:** CPA 30%+ mejor que objetivo (escalar), presupuesto subutilizado

## Flujo de Aprobaciones

1. Sistema detecta oportunidad de optimizacion
2. Crea solicitud de aprobacion con: tipo, campana, valor actual, cambio propuesto, razon, impacto
3. Notifica al Paid Media Specialist via Slack
4. Specialist revisa en `/approvals` o desde Slack
5. Aprueba o rechaza con notas opcionales
6. Solo si aprobado, se ejecuta el cambio

## Planilla de Medios (Google Sheets)

- Conecta via Google Sheets API
- Compara gasto planificado vs real
- Detecta desviaciones >30% como alertas criticas
- Detecta sub-ejecucion >50% como advertencia

## Recaps Diarios

- Endpoint `/api/recaps` genera resumen del dia
- POST a `/api/recaps` envia recap a Slack
- Incluye: gasto total, conversiones, mejor/peor campana, breakdown por plataforma, recomendaciones

## Desarrollo Local

```bash
cd paid-media-dashboard
npm install
npm run dev
```

Sin credenciales de API, usa datos mock automaticamente. Ver `.env.example` para configurar APIs reales.

## Comandos Utiles

```bash
npm run dev          # Desarrollo local (http://localhost:3000)
npm run build        # Build de produccion
npm run start        # Servidor de produccion
```
