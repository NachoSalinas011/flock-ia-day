import { AlertTriangle, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-text-soft">
      <Loader2 size={16} className="animate-spin text-brand" /> {label}
    </div>
  )
}

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="chip-blocked flex items-start gap-2 rounded-lg px-3 py-2 text-[13px]">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{message}</span>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</div>
      <div className="text-[16.5px] font-extrabold text-text">{title}</div>
      {children && <div className="max-w-md text-[13.5px] text-text-soft">{children}</div>}
    </div>
  )
}
