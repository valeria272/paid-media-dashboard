---
name: paid-media-dashboard
description: Crea y mantiene dashboards web en tiempo real para campanas de paid media. Usar cuando se necesite construir un dashboard interactivo, visualizar metricas de Google Ads, Meta Ads, TikTok o LinkedIn, crear reportes automaticos con actualizacion 24/7, o construir cualquier interfaz de monitoreo de campanas. Todos los valores monetarios en pesos chilenos CLP formato $5.000.
---

# Dashboard de Paid Media — Tiempo Real

## Capacidades

1. **Dashboard en tiempo real** — Metricas actualizadas cada 5 min de Google, Meta, TikTok, LinkedIn
2. **Alertas automaticas** — Deteccion de sobregasto, CPA alto, falta de conversiones, CTR bajo
3. **Notificaciones Slack** — Alertas criticas enviadas automaticamente + recaps diarios
4. **Planilla de medios** — Comparacion gasto real vs planificado (Google Sheets)
5. **Aprobaciones humanas** — Todo cambio requiere revision del Paid Media Specialist
6. **Recaps diarios** — Resumen con metricas, alertas, y recomendaciones

## Flujo de Trabajo

```
1. Conectar fuentes de datos (APIs / mock)
2. Dashboard muestra metricas en tiempo real
3. Sistema detecta alertas automaticamente
4. Alertas criticas → Slack inmediatamente
5. Optimizaciones propuestas → Cola de aprobacion
6. Paid Media Specialist revisa y aprueba/rechaza
7. Solo cambios aprobados se ejecutan
8. Recap diario enviado a Slack al cierre del dia
```

## Reglas

- Moneda CLP: `$5.000` — nunca decimales, nunca coma en miles
- Solo lectura por defecto — nunca modificar campanas sin aprobacion
- Graceful degradation — si una API falla, las demas continuan
- Rate limits respetados — no exceder limites de cada plataforma
