import clsx from 'clsx'
import { Star } from 'lucide-react'
import { fmtDate } from '../../lib/format'
import type { Proposal } from '../../lib/types'

interface Props {
  proposals: Proposal[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Version picker shared by the proposal and modules tabs (oldest first, formal starred). */
export function VersionChips({ proposals, selectedId, onSelect }: Props) {
  if (!proposals.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {proposals
        .slice()
        .reverse()
        .map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={clsx(
              'flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] font-bold transition-colors',
              p.id === selectedId ? 'border-brand bg-brand text-white' : 'border-border-strong bg-panel text-text-soft hover:bg-surface',
            )}
            title={`${fmtDate(p.createdAt)}${p.model ? ` · ${p.model}` : ''}`}
          >
            {p.options.some((o) => o.isFormal) && <Star size={12} fill="currentColor" />} v{p.version}
          </button>
        ))}
    </div>
  )
}
