# Planilla de Medios (Google Sheets)

## Conexion

Conecta a una Google Sheet que contiene la planilla de medios del cliente.

## Estructura esperada de la hoja

La hoja `MediaPlan` debe tener estas columnas a partir de A2:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Plataforma | Nombre Campana | Presupuesto Mensual | Presupuesto Diario | KPI Target | Valor KPI | Fecha Inicio | Fecha Fin | Estado |

Ejemplo:
```
google | Google - Brand Search | 3000000 | 100000 | CPA | 5000 | 2026-04-01 | 2026-04-30 | active
meta   | Meta - Prospeccion    | 4500000 | 150000 | CPA | 12000| 2026-04-01 | 2026-04-30 | active
```

## Alertas de planilla

- **Critica:** Gasto real >30% sobre planificado
- **Critica:** CPA real >50% sobre objetivo de planilla
- **Advertencia:** Gasto real >50% por debajo de planificado

## Configuracion

```env
GOOGLE_SHEETS_API_KEY=tu-api-key
MEDIA_PLAN_SHEET_ID=id-de-la-hoja
MEDIA_PLAN_RANGE=MediaPlan!A2:I100
```

## Archivo principal

`src/lib/sheets/mediaplan.ts`
