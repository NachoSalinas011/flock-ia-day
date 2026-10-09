import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { api } from '../lib/api'
import { notebookKeys } from './useNotebooks'

const sourceKeys = { list: (notebookId: string) => ['sources', notebookId] as const }

/** Safety net: stop polling a source set that stays in process this long (the backend marks interrupted ones as ERROR). */
const MAX_POLLING_MS = 3 * 60_000

export function useSources(notebookId: string) {
  // when polling started and for which set of in-process sources
  const polling = useRef<{ key: string; since: number } | null>(null)
  return useQuery({
    queryKey: sourceKeys.list(notebookId),
    queryFn: () => api.sources.list(notebookId),
    // poll while something is still being processed
    refetchInterval: (query) => {
      const inProcess = query.state.data?.filter((s) => s.status === 'PENDING' || s.status === 'PROCESSING') ?? []
      if (!inProcess.length) {
        polling.current = null
        return false
      }
      const key = inProcess.map((s) => s.id).sort().join(',')
      if (polling.current?.key !== key) polling.current = { key, since: Date.now() }
      return Date.now() - polling.current.since < MAX_POLLING_MS ? 1500 : false
    },
  })
}

function useInvalidateSources(notebookId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: sourceKeys.list(notebookId) })
    void queryClient.invalidateQueries({ queryKey: notebookKeys.all })
  }
}

export function useUploadSources(notebookId: string) {
  const invalidate = useInvalidateSources(notebookId)
  return useMutation({ mutationFn: (files: File[]) => api.sources.upload(notebookId, files), onSuccess: invalidate })
}

export function useCreateTextSource(notebookId: string) {
  const invalidate = useInvalidateSources(notebookId)
  return useMutation({
    mutationFn: (body: { title: string; content: string }) => api.sources.createText(notebookId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteSource(notebookId: string) {
  const invalidate = useInvalidateSources(notebookId)
  return useMutation({ mutationFn: api.sources.remove, onSuccess: invalidate })
}

export function useSourceText(sourceId: string | null) {
  return useQuery({
    queryKey: ['source-text', sourceId],
    queryFn: () => api.sources.text(sourceId!),
    enabled: Boolean(sourceId),
  })
}
