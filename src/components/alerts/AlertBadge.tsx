interface AlertBadgeProps {
  count: number
  severity: 'critical' | 'warning' | 'opportunity'
}

const BADGE_STYLES: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  warning: 'bg-yellow-400 text-yellow-900',
  opportunity: 'bg-green-500 text-white',
}

export function AlertBadge({ count, severity }: AlertBadgeProps) {
  if (count === 0) return null

  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${BADGE_STYLES[severity]}`}>
      {count}
    </span>
  )
}
