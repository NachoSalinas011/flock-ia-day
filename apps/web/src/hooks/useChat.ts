import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ChatMessage } from '../lib/types'

const chatKeys = { list: (notebookId: string) => ['chat', notebookId] as const }

export function useChat(notebookId: string) {
  return useQuery({ queryKey: chatKeys.list(notebookId), queryFn: () => api.chat.list(notebookId) })
}

export function useSendMessage(notebookId: string) {
  const queryClient = useQueryClient()
  const key = chatKeys.list(notebookId)
  return useMutation({
    mutationFn: (message: string) => api.chat.send(notebookId, message),
    // show the question immediately while the model answers
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: key })
      const optimistic: ChatMessage = {
        id: `tmp-${Date.now()}`,
        role: 'USER',
        content: message,
        citations: [],
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), optimistic])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useClearChat(notebookId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.chat.clear(notebookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.list(notebookId) }),
  })
}
