# Sistema de Aprobaciones Humanas

## Principio

**NUNCA ejecutar cambios en campanas sin aprobacion del Paid Media Specialist.**

## Flujo

```
Deteccion de oportunidad
  → Crear solicitud de aprobacion
    → Notificar por Slack (con botones Aprobar/Rechazar)
      → Specialist revisa en /approvals o Slack
        → Aprueba: se ejecuta el cambio
        → Rechaza: no se hace nada
        → 24h sin respuesta: expira automaticamente
```

## Tipos de cambio que requieren aprobacion

| Tipo | Descripcion |
|------|------------|
| `budget_change` | Cambio de presupuesto diario/mensual |
| `pause_campaign` | Pausar una campana |
| `enable_campaign` | Reactivar una campana pausada |
| `bid_change` | Cambio de pujas |
| `optimization` | Cualquier otra optimizacion |

## Archivos clave

- `src/lib/approvals/approvalStore.ts` — Store de aprobaciones
- `src/app/api/approvals/route.ts` — API de aprobaciones
- `src/app/approvals/page.tsx` — UI de revision
- `src/components/approvals/ApprovalCard.tsx` — Tarjeta de aprobacion
- `src/hooks/useApprovals.ts` — Hook con polling cada 30 seg

## Notificacion Slack

Cada solicitud envia un mensaje a Slack con:
- Tipo de cambio, plataforma, campana
- Valor actual vs propuesto
- Razon e impacto esperado
- Botones de Aprobar/Rechazar que llevan a la app
