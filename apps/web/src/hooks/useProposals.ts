import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Priority, Proposal, RoleHours, ScopeVariant, TeamMember } from '../lib/types'
import { notebookKeys } from './useNotebooks'

export const proposalKeys = { list: (notebookId: string) => ['proposals', notebookId] as const }

export function useProposals(notebookId: string) {
  return useQuery({ queryKey: proposalKeys.list(notebookId), queryFn: () => api.proposals.list(notebookId) })
}

/** Every edit returns the whole proposal: write it into the list without refetching. */
function useProposalMutation<TVariables>(notebookId: string, mutationFn: (variables: TVariables) => Promise<Proposal>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (updated) => {
      queryClient.setQueryData<Proposal[]>(proposalKeys.list(notebookId), (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p)),
      )
      // formal flags can change in other versions too
      void queryClient.invalidateQueries({ queryKey: ['proposal-insights', updated.id] })
    },
  })
}

export const generateKey = (notebookId: string) => ['generate', notebookId] as const

export function useGenerateProposal(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: generateKey(notebookId),
    mutationFn: ({ instructions, fresh }: { instructions?: string; fresh?: boolean }) =>
      api.proposals.generate(notebookId, instructions, fresh),
    onSuccess: (created) => {
      // the new version is in the list before anyone selects it
      queryClient.setQueryData<Proposal[]>(proposalKeys.list(notebookId), (old) => [
        created,
        ...(old ?? []).filter((p) => p.id !== created.id),
      ])
      void queryClient.invalidateQueries({ queryKey: proposalKeys.list(notebookId) })
      void queryClient.invalidateQueries({ queryKey: notebookKeys.all })
    },
  })
}

export function useMarkFormal(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.options.markFormal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: proposalKeys.list(notebookId) }),
  })
}

export const useUpdateTeam = (notebookId: string) =>
  useProposalMutation(notebookId, ({ optionId, team }: { optionId: string; team: TeamMember[] }) =>
    api.options.updateTeam(optionId, team),
  )

export const useUpdateSettings = (notebookId: string) =>
  useProposalMutation(notebookId, ({ optionId, ...body }: { optionId: string; pmOverheadPct?: number; contingencyPct?: number }) =>
    api.options.updateSettings(optionId, body),
  )

export const useSetOptionModule = (notebookId: string) =>
  useProposalMutation(
    notebookId,
    ({ optionId, moduleId, included, variant }: { optionId: string; moduleId: string; included: boolean; variant?: ScopeVariant }) =>
      api.options.setModule(optionId, moduleId, { included, variant }),
  )

export const useReplan = (notebookId: string) => useProposalMutation(notebookId, (optionId: string) => api.options.replan(optionId))

export const useUpdateTarget = (notebookId: string) =>
  useProposalMutation(notebookId, ({ proposalId, targetDate }: { proposalId: string; targetDate: string | null }) =>
    api.proposals.updateTarget(proposalId, targetDate),
  )

export const useUpdateModule = (notebookId: string) =>
  useProposalMutation(
    notebookId,
    ({
      proposalId,
      moduleId,
      ...body
    }: {
      proposalId: string
      moduleId: string
      estimatedHours?: RoleHours
      reducedHours?: RoleHours
      priority?: Priority
    }) => api.proposals.updateModule(proposalId, moduleId, body),
  )

export function useDeleteProposal(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.proposals.remove,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Proposal[]>(proposalKeys.list(notebookId), (old) => old?.filter((p) => p.id !== id))
      void queryClient.invalidateQueries({ queryKey: proposalKeys.list(notebookId) })
      void queryClient.invalidateQueries({ queryKey: notebookKeys.all })
    },
  })
}

export function useProposalInsights(proposalId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['proposal-insights', proposalId],
    queryFn: () => api.proposals.insights(proposalId!),
    enabled: Boolean(proposalId) && enabled,
    staleTime: 60_000,
  })
}
