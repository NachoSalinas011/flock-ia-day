import type {
  ChatMessage,
  Notebook,
  NotebookStatus,
  Priority,
  Proposal,
  ProposalInsights,
  RoleHours,
  ScopeVariant,
  Source,
  TeamMember,
} from './types'

const BASE_URL = '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: isForm ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = Array.isArray(payload?.message)
      ? payload.message.join('. ')
      : (payload?.message ?? `Error ${response.status}`)
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  notebooks: {
    list: (status?: NotebookStatus) =>
      request<Notebook[]>(`/notebooks${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<Notebook>(`/notebooks/${id}`),
    create: (body: { name: string; client?: string; industry?: string }) =>
      request<Notebook>('/notebooks', { method: 'POST', body: json(body) }),
    remove: (id: string) => request<void>(`/notebooks/${id}`, { method: 'DELETE' }),
  },
  sources: {
    list: (notebookId: string) => request<Source[]>(`/notebooks/${notebookId}/sources`),
    upload: (notebookId: string, files: File[]) => {
      const form = new FormData()
      files.forEach((file) => form.append('files', file))
      return request<Source[]>(`/notebooks/${notebookId}/sources`, { method: 'POST', body: form })
    },
    createText: (notebookId: string, body: { title: string; content: string }) =>
      request<Source>(`/notebooks/${notebookId}/sources/text`, { method: 'POST', body: json(body) }),
    text: (id: string) => request<{ filename: string; text: string }>(`/sources/${id}/text`),
    remove: (id: string) => request<void>(`/sources/${id}`, { method: 'DELETE' }),
  },
  chat: {
    list: (notebookId: string) => request<ChatMessage[]>(`/notebooks/${notebookId}/chat`),
    send: (notebookId: string, message: string) =>
      request<ChatMessage>(`/notebooks/${notebookId}/chat`, { method: 'POST', body: json({ message }) }),
    clear: (notebookId: string) => request<void>(`/notebooks/${notebookId}/chat`, { method: 'DELETE' }),
  },
  proposals: {
    list: (notebookId: string) => request<Proposal[]>(`/notebooks/${notebookId}/proposals`),
    /** `fresh` bypasses the LLM response cache: only for regenerations ("Nueva versión"). */
    generate: (notebookId: string, instructions?: string, fresh?: boolean) =>
      request<Proposal>(`/notebooks/${notebookId}/proposals/generate`, {
        method: 'POST',
        body: json({ ...(instructions ? { instructions } : {}), ...(fresh ? { fresh: true } : {}) }),
      }),
    updateTarget: (id: string, targetDate: string | null) =>
      request<Proposal>(`/proposals/${id}/target`, { method: 'PATCH', body: json({ targetDate }) }),
    updateModule: (
      id: string,
      moduleId: string,
      body: { estimatedHours?: RoleHours; reducedHours?: RoleHours; priority?: Priority },
    ) => request<Proposal>(`/proposals/${id}/modules/${moduleId}`, { method: 'PATCH', body: json(body) }),
    remove: (id: string) => request<void>(`/proposals/${id}`, { method: 'DELETE' }),
    exportUrl: (id: string) => `${BASE_URL}/proposals/${id}/export.md`,
    insights: (id: string) => request<ProposalInsights>(`/proposals/${id}/insights`),
    c4Mermaid: (id: string) => fetch(`${BASE_URL}/proposals/${id}/c4.mmd`).then((r) => r.text()),
  },
  options: {
    markFormal: (optionId: string) => request<Proposal>(`/options/${optionId}/formal`, { method: 'POST' }),
    updateTeam: (optionId: string, team: TeamMember[]) =>
      request<Proposal>(`/options/${optionId}/team`, {
        method: 'PUT',
        body: json({
          team: team.map(({ role, seniority, count, dedication }) => ({ role, seniority, count, dedication })),
        }),
      }),
    updateSettings: (optionId: string, body: { pmOverheadPct?: number; contingencyPct?: number }) =>
      request<Proposal>(`/options/${optionId}/settings`, { method: 'PATCH', body: json(body) }),
    setModule: (optionId: string, moduleId: string, body: { included: boolean; variant?: ScopeVariant }) =>
      request<Proposal>(`/options/${optionId}/modules/${moduleId}`, { method: 'PUT', body: json(body) }),
    replan: (optionId: string) => request<Proposal>(`/options/${optionId}/replan`, { method: 'POST' }),
  },
}
