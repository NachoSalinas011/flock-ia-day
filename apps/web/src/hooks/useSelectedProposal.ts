import { useEffect, useState } from 'react'
import type { Tier } from '../lib/types'
import { useProposals } from './useProposals'

/**
 * Selected version and option for a notebook. Defaults to the formal option;
 * otherwise the newest version and its balanced option (or the only one).
 */
export function useSelectedProposal(notebookId: string) {
  const { data: proposals, isFetching } = useProposals(notebookId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier>('BALANCED')

  useEffect(() => {
    if (!proposals?.length) return
    if (selectedId && proposals.some((p) => p.id === selectedId)) return
    // a just-created version may not be in the list yet: wait for the refetch
    if (selectedId && isFetching) return
    const formal = proposals.find((p) => p.options.some((o) => o.isFormal))
    const proposal = formal ?? proposals[0]
    setSelectedId(proposal.id)
    const option =
      proposal.options.find((o) => o.isFormal) ??
      proposal.options.find((o) => o.tier === 'BALANCED') ??
      proposal.options[0]
    if (option) setTier(option.tier)
  }, [proposals, selectedId, isFetching])

  const proposal = proposals?.find((p) => p.id === selectedId) ?? null
  const option = proposal?.options.find((o) => o.tier === tier) ?? proposal?.options[0] ?? null

  return { proposals, proposal, option, selectedId, setSelectedId, tier: option?.tier ?? tier, setTier }
}

export type SelectedProposal = ReturnType<typeof useSelectedProposal>
