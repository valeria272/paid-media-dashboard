# Logica de Alertas Automaticas

## Severidades

| Severidad | Cuando | Accion |
|-----------|--------|--------|
| **critical** | Sobregasto >120%, CPA >2x, sin conversiones con gasto, pacing <50% PM | Slack inmediato + banner rojo |
| **warning** | CTR bajo, CPA 20-100% sobre objetivo | Lista de alertas en dashboard |
| **opportunity** | CPA 30%+ mejor, presupuesto subutilizado | Sugerencia de escalamiento |

## Archivo principal

`src/lib/alerts/detectAlerts.ts`

## KPI Targets por plataforma

`src/config/kpis.ts` — Actualizar con objetivos reales del cliente.

| Plataforma | Max CPA | Min CTR | Min Gasto para alerta sin conv. |
|------------|---------|---------|--------------------------------|
| Google | $30.000 | 1,5% | $50.000 |
| Meta | $15.000 | 0,5% | $40.000 |
| TikTok | $20.000 | 0,5% | $30.000 |
| LinkedIn | $60.000 | 0,3% | $80.000 |
