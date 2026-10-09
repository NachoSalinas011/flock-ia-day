import { Star } from 'lucide-react'
import { TIER_LABEL } from '../../lib/format'
import type { ProposalOption, Tier } from '../../lib/types'

/** Segmented control to switch between the scope options of a version. */
export function OptionTabs({ options, tier, onSelect }: { options: ProposalOption[]; tier: Tier; onSelect: (tier: Tier) => void }) {
  if (options.length < 2) return null
  return (
    <div className="flex overflow-hidden rounded-[9px] border border-border-strong">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onSelect(o.tier)}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold"
          style={{ background: o.tier === tier ? 'var(--brand)' : 'var(--panel)', color: o.tier === tier ? '#fff' : 'var(--text-soft)' }}
        >
          {o.isFormal && <Star size={12} fill="currentColor" />}
          {TIER_LABEL[o.tier]}
        </button>
      ))}
    </div>
  )
}
