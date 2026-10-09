import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { NotebookStatus } from '../lib/types'

export const notebookKeys = {
  all: ['notebooks'] as const,
  list: (status?: NotebookStatus) => ['notebooks', 'list', status ?? 'all'] as const,
  detail: (id: string) => ['notebooks', id] as const,
}

export function useNotebooks(status?: NotebookStatus) {
  return useQuery({ queryKey: notebookKeys.list(status), queryFn: () => api.notebooks.list(status) })
}

export function useNotebook(id: string) {
  return useQuery({ queryKey: notebookKeys.detail(id), queryFn: () => api.notebooks.get(id) })
}

export function useCreateNotebook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.notebooks.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notebookKeys.all }),
  })
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.notebooks.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notebookKeys.all }),
  })
}
