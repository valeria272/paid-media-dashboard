# Integracion Slack

## Configuracion

1. Crear una Slack App en api.slack.com
2. Activar Incoming Webhooks
3. Crear un webhook para el canal deseado
4. Agregar `SLACK_WEBHOOK_URL` y `SLACK_CHANNEL` en `.env.local`

## Que se envia a Slack

| Evento | Cuando | Formato |
|--------|--------|---------|
| Alertas criticas | Cada 5 min si hay nuevas | Batch con detalle por campana |
| Solicitud de aprobacion | Al crear optimizacion | Tarjeta con botones Aprobar/Rechazar |
| Recap diario | POST a `/api/recaps` | Resumen completo del dia |

## Archivo principal

`src/lib/slack/sendAlert.ts` — Contiene:
- `sendAlertToSlack()` — Alerta individual
- `sendAlertBatchToSlack()` — Resumen de multiples alertas
- `sendApprovalRequestToSlack()` — Solicitud de aprobacion
- `sendRecapToSlack()` — Recap diario completo

## Sin Slack configurado

Si `SLACK_WEBHOOK_URL` no esta definido, todas las funciones retornan `false` y logean un warning en consola. El dashboard funciona normalmente sin Slack.
