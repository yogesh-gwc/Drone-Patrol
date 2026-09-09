export type StatusTone = 'neutral' | 'pending' | 'ok' | 'error'

const toneClasses: Record<StatusTone, string> = {
  neutral:
    'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  pending:
    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300',
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600/50 dark:bg-emerald-500/10 dark:text-emerald-300',
  error:
    'border-red-300 bg-red-50 text-red-700 dark:border-red-600/50 dark:bg-red-500/10 dark:text-red-300',
}

const dotClasses: Record<StatusTone, string> = {
  neutral: 'bg-slate-400 dark:bg-slate-500',
  pending: 'bg-amber-500 dark:bg-amber-400',
  ok: 'bg-emerald-500 dark:bg-emerald-400',
  error: 'bg-red-500 dark:bg-red-400',
}

interface StatusBadgeProps {
  tone: StatusTone
  label: string
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 text-xs font-medium tracking-wide uppercase ${toneClasses[tone]}`}
    >
      <span className={`size-1.5 rounded-full ${dotClasses[tone]}`} />
      {label}
    </span>
  )
}
