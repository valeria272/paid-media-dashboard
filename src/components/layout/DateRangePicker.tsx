'use client'

import { useState } from 'react'

export type DatePreset = 'today' | '7d' | 'mtd' | 'last_month' | '30d' | 'custom'

interface DateRangePickerProps {
  onRangeChange: (start: string, end: string, label: string) => void
  currentLabel?: string
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: 'Ultimos 7 dias' },
  { id: 'mtd', label: 'Mes actual' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: '30d', label: 'Ultimos 30 dias' },
  { id: 'custom', label: 'Personalizado' },
]

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (preset) {
    case 'today':
      return { start: fmt(now), end: fmt(now) }
    case '7d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      return { start: fmt(start), end: fmt(now) }
    }
    case 'mtd':
      return {
        start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        end: fmt(now),
      }
    case 'last_month': {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate()
      return {
        start: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`,
        end: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${lastDay}`,
      }
    }
    case '30d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { start: fmt(start), end: fmt(now) }
    }
    default:
      return { start: fmt(now), end: fmt(now) }
  }
}

export function DateRangePicker({ onRangeChange, currentLabel }: DateRangePickerProps) {
  const [active, setActive] = useState<DatePreset>('mtd')
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustom(true)
      setActive('custom')
      return
    }
    setShowCustom(false)
    setActive(preset)
    const { start, end } = getPresetDates(preset)
    const label = PRESETS.find(p => p.id === preset)?.label || ''
    onRangeChange(start, end, label)
  }

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onRangeChange(customStart, customEnd, `${customStart} a ${customEnd}`)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handlePreset(preset.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              active === preset.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
          />
          <span className="text-gray-400 text-xs">a</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
          />
          <button
            onClick={handleCustomApply}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
