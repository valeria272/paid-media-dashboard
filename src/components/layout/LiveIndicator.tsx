'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function LiveIndicator({ lastUpdated }: { lastUpdated?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      {lastUpdated
        ? `Actualizado ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: es })}`
        : 'Conectando...'}
    </div>
  )
}
