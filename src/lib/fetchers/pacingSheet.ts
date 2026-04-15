// ═══ Planilla de seguimiento de pacing ═══
// Lee presupuestos aprobados y escribe gasto semanal en la planilla
// Sheet ID: configurado en env PACING_SHEET_ID
//
// Estructura de cada bloque en la planilla (fila de encabezado + filas de datos):
// MES | Planif. | Pago | Cliente | Canal | Presupuesto aprobado | Sem1 | Sem2 | Sem3 | Sem4 | Sem5 | Acumulado | %Acum | DiasM | %Esp | Estado

import type { PacingChannel } from './pacingSpend'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PacingRow {
  /** Nombre del mes ("Abril", "Mayo", etc.) */
  month: string
  /** Nombre del cliente tal como aparece en la planilla */
  clientName: string
  /** Canal ("Google Ads", "Meta Ads", "Tik Tok Ads") */
  channel: PacingChannel
  /** Presupuesto aprobado en CLP para el mes */
  approvedBudget: number
  /** Semana actual (1-5) determinada por la fecha */
  currentWeek: number
  /** Rango de fechas de la semana actual */
  weekRange: { start: string; end: string }
  /** Gastos ya registrados por semana (null = vacío) */
  weeklySpend: (number | null)[]
  /** Gasto acumulado en la planilla */
  accumulatedSpend: number
  /** Índice de fila real en la hoja (para escribir de vuelta) */
  sheetRowIndex: number
  /** Índice de columna de la semana actual (para escribir de vuelta) */
  weekColIndex: number
  /** Nombre de la pestaña de la hoja */
  sheetName: string
}

export interface WeekDefinition {
  weekNumber: number
  startDay: number
  endDay: number
  colIndex: number // índice en el array de valores (6=Sem1, 7=Sem2, ...)
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

// ─── Helper: obtener Access Token para Google APIs ───────────────────────────

async function getAccessToken(): Promise<string> {
  const { google } = await import('googleapis')
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN })
  const { token } = await oauth2Client.getAccessToken()
  return token || ''
}

// ─── Leer planilla completa ───────────────────────────────────────────────────

/**
 * Lee todos los valores de la planilla de seguimiento.
 * Retorna las filas del mes actual, listas para ser actualizadas.
 */
export async function readPacingRows(targetMonth?: string, targetWeek?: number, includeZeroBudget = false): Promise<PacingRow[]> {
  const sheetId = process.env.PACING_SHEET_ID?.trim()
  if (!sheetId) {
    console.warn('[pacing] PACING_SHEET_ID no configurado')
    return []
  }

  const token = await getAccessToken()

  // Obtener lista de pestañas
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!metaRes.ok) {
    console.error('[pacing] Error leyendo metadata de Sheets:', metaRes.status)
    return []
  }
  const meta = await metaRes.json()
  const sheets: Array<{ properties: { title: string; sheetId: number } }> = meta.sheets || []

  const now = new Date()
  const currentMonthName = targetMonth || getMonthName(now.getMonth())
  const currentDay = now.getDate()
  const currentYear = now.getFullYear()

  const allRows: PacingRow[] = []

  for (const sheet of sheets) {
    const sheetName = sheet.properties.title
    const rows = await readSheetRows(sheetId, sheetName, token)
    const parsed = parseMonthBlock(rows, currentMonthName, currentDay, currentYear, sheetName, targetWeek, includeZeroBudget)
    allRows.push(...parsed)
  }

  return allRows
}

// ─── Leer filas de una pestaña ────────────────────────────────────────────────

async function readSheetRows(sheetId: string, sheetName: string, token: string): Promise<string[][]> {
  const range = encodeURIComponent(`${sheetName}`)
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.values || []
}

// ─── Parsear bloques de mes ───────────────────────────────────────────────────

function parseMonthBlock(
  rows: string[][],
  targetMonth: string,
  currentDay: number,
  currentYear: number,
  sheetName: string,
  targetWeek?: number,
  includeZeroBudget = false
): PacingRow[] {
  const result: PacingRow[] = []
  let inTargetBlock = false
  let weekDefs: WeekDefinition[] = []
  let currentMonthLabel = ''

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    // Detectar fila de encabezado: contiene "MES" en col 1 y "Semana" en alguna columna
    if (row[1]?.trim() === 'MES' && row.some(c => c?.includes('Semana'))) {
      weekDefs = parseWeekDefinitions(row)
      continue
    }

    // Detectar inicio de bloque de mes (col 1 tiene un nombre de mes)
    const cellMonth = row[1]?.trim().toLowerCase()
    if (cellMonth && MONTH_NAMES[cellMonth] !== undefined) {
      currentMonthLabel = row[1].trim()
      inTargetBlock = currentMonthLabel.toLowerCase() === targetMonth.toLowerCase()
      continue
    }

    // Si estamos en el bloque del mes actual y hay datos de cliente
    if (inTargetBlock && weekDefs.length > 0 && row[4]?.trim()) {
      const clientName = row[4].trim()
      const channel = row[5]?.trim() as PacingChannel
      const approvedBudget = parseCLP(row[6] || '0')

      if (!channel || !['Google Ads', 'Meta Ads', 'Tik Tok Ads'].includes(channel)) continue
      if (approvedBudget === 0 && !includeZeroBudget) continue

      // Gastos por semana registrados en la planilla
      const weeklySpend = weekDefs.map(w => {
        const val = row[w.colIndex]?.trim()
        if (!val || val === '' || val === '-' || val === '#VALUE!') return null
        return parseCLP(val)
      })

      // Gasto acumulado (col después de las semanas)
      const accumCol = weekDefs[weekDefs.length - 1].colIndex + 1
      const accumulatedSpend = parseCLP(row[accumCol] || '0')

      // Semana actual y su rango de fechas (o semana forzada para backfill)
      const currentWeekDef = targetWeek
        ? (weekDefs.find(w => w.weekNumber === targetWeek) ?? null)
        : getCurrentWeek(weekDefs, currentDay)

      if (!currentWeekDef) continue

      const weekRange = getWeekDateRange(currentWeekDef, currentMonthLabel, currentYear)

      result.push({
        month: currentMonthLabel,
        clientName,
        channel,
        approvedBudget,
        currentWeek: currentWeekDef.weekNumber,
        weekRange,
        weeklySpend,
        accumulatedSpend,
        sheetRowIndex: i + 1, // 1-based para la API de Sheets
        weekColIndex: currentWeekDef.colIndex,
        sheetName,
      })
    }
  }

  return result
}

// ─── Parsear definiciones de semanas desde el encabezado ─────────────────────

function parseWeekDefinitions(headerRow: string[]): WeekDefinition[] {
  const defs: WeekDefinition[] = []

  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i]
    // Formato: "Semana 1 (1 al 5)" o "Semana 1 (1 al 8)"
    const match = cell?.match(/Semana\s+(\d+)\s*\((\d+)\s+(?:al|y)\s+(\d+)\)/i)
    if (match) {
      defs.push({
        weekNumber: Number(match[1]),
        startDay: Number(match[2]),
        endDay: Number(match[3]),
        colIndex: i,
      })
    }
  }

  return defs
}

// ─── Determinar semana actual ─────────────────────────────────────────────────

function getCurrentWeek(weekDefs: WeekDefinition[], day: number): WeekDefinition | null {
  // Buscar la semana que contiene el día actual
  for (const w of weekDefs) {
    if (day >= w.startDay && day <= w.endDay) return w
  }
  // Si el día supera la última semana definida, usar la última
  if (weekDefs.length > 0 && day > weekDefs[weekDefs.length - 1].endDay) {
    return weekDefs[weekDefs.length - 1]
  }
  return weekDefs[0] || null
}

// ─── Calcular rango de fechas de una semana ───────────────────────────────────

function getWeekDateRange(
  week: WeekDefinition,
  monthName: string,
  year: number
): { start: string; end: string } {
  const monthIndex = MONTH_NAMES[monthName.toLowerCase()] ?? new Date().getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    start: `${year}-${pad(monthIndex + 1)}-${pad(week.startDay)}`,
    end: `${year}-${pad(monthIndex + 1)}-${pad(week.endDay)}`,
  }
}

// ─── Escribir gasto semanal en la planilla ────────────────────────────────────

/**
 * Escribe el gasto real de una semana en la celda correspondiente.
 * Requiere scope "spreadsheets" en el token (no "spreadsheets.readonly").
 * Si falla por permisos, loguea el error y continúa.
 */
export async function writeWeeklySpend(
  updates: Array<{ row: PacingRow; spend: number }>
): Promise<{ written: number; skipped: number }> {
  const sheetId = process.env.PACING_SHEET_ID?.trim()
  if (!sheetId) return { written: 0, skipped: updates.length }

  const token = await getAccessToken()
  const valueRanges = updates.map(({ row, spend }) => {
    // Convertir índice de columna a letra (0=A, 1=B, ..., 6=G, ...)
    const colLetter = indexToColLetter(row.weekColIndex)
    const cellAddress = `${row.sheetName}!${colLetter}${row.sheetRowIndex}`
    return {
      range: cellAddress,
      values: [[formatCLPForSheet(spend)]],
    }
  })

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[pacing] Error escribiendo en Sheets:', res.status, text)
    console.error('[pacing] Nota: si es 403, regenerar token con scope "spreadsheets" (no readonly)')
    return { written: 0, skipped: updates.length }
  }

  console.log(`[pacing] Escribió ${updates.length} celdas en la planilla`)
  return { written: updates.length, skipped: 0 }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCLP(value: string): number {
  const cleaned = value.replace(/[$.\s]/g, '').replace(/,/g, '').trim()
  return Number(cleaned) || 0
}

function formatCLPForSheet(value: number): string {
  return '$' + Math.round(value).toLocaleString('es-CL')
}

function indexToColLetter(index: number): string {
  let letter = ''
  let n = index + 1 // 1-based
  while (n > 0) {
    const rem = (n - 1) % 26
    letter = String.fromCharCode(65 + rem) + letter
    n = Math.floor((n - 1) / 26)
  }
  return letter
}

function getMonthName(monthIndex: number): string {
  const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return names[monthIndex]
}

// ─── Calcular proyección mensual ──────────────────────────────────────────────

/**
 * Proyecta el gasto mensual basado en el promedio diario.
 * Lógica: (gasto_acumulado / días_transcurridos) × días_del_mes
 */
export function calculateProjection(
  accumulatedSpend: number,
  daysElapsed: number,
  daysInMonth: number
): number {
  if (daysElapsed <= 0) return 0
  const dailyAvg = accumulatedSpend / daysElapsed
  return Math.round(dailyAvg * daysInMonth)
}
