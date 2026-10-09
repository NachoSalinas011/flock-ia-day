import { Archive, FileText, MessageSquare, SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EmptyState, ErrorBanner, Spinner } from '../../components/Feedback'
import { Modal } from '../../components/Modal'
import { useChat, useClearChat, useSendMessage } from '../../hooks/useChat'
import type { ChatMessage, Citation } from '../../lib/types'

const SUGGESTIONS = [
  '¿Cuáles son los módulos principales que pide el cliente?',
  '¿Qué integraciones con terceros o sistemas existentes se mencionan?',
  '¿Qué riesgos ves comparando con proyectos anteriores?',
  '¿Qué información falta para estimar con más precisión?',
]

interface ChatPanelProps {
  notebookId: string
  /** text to prefill (e.g. coming from the coverage view); the user still sends it */
  draft?: string | null
  onDraftConsumed?: () => void
}

export function ChatPanel({ notebookId, draft: incomingDraft, onDraftConsumed }: ChatPanelProps) {
  const { data: messages, isLoading, error } = useChat(notebookId)
  const send = useSendMessage(notebookId)
  const clear = useClearChat(notebookId)
  const [draft, setDraft] = useState('')
  const [citation, setCitation] = useState<Citation | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (incomingDraft) {
      setDraft(incomingDraft)
      onDraftConsumed?.()
    }
  }, [incomingDraft, onDraftConsumed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages?.length, send.isPending])

  const ask = (text: string) => {
    if (!text.trim() || send.isPending) return
    send.mutate(text.trim())
    setDraft('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(draft)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {isLoading && <Spinner label="Cargando conversación…" />}
          <ErrorBanner error={error} />
          {messages?.length === 0 && (
            <EmptyState icon={<MessageSquare size={22} />} title="Preguntale a tus fuentes">
              Las respuestas se basan en las fuentes del notebook y en los proyectos históricos, siempre con citas.
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="btn btn-small" onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </EmptyState>
          )}
          {messages?.map((m) => <Message key={m.id} message={m} onCitation={setCitation} />)}
          {send.isPending && (
            <div className="card self-start px-4 py-3">
              <Spinner label="Leyendo las fuentes y pensando…" />
            </div>
          )}
          <ErrorBanner error={send.error} />
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={submit} className="border-t border-border bg-panel px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            className="input max-h-40 min-h-[42px] flex-1 resize-none"
            rows={draft.length > 120 ? 3 : 1}
            placeholder="Preguntá algo sobre la oportunidad…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(draft)
              }
            }}
          />
          <button type="submit" className="btn btn-primary h-[42px]" disabled={!draft.trim() || send.isPending}>
            <SendHorizontal size={16} />
          </button>
          {!!messages?.length && (
            <button type="button" className="btn btn-icon h-[42px]" title="Borrar conversación" onClick={() => clear.mutate()}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </form>

      {citation && (
        <Modal title={`[${citation.index}] ${citation.filename}`} onClose={() => setCitation(null)} wide>
          <div className="flex flex-wrap gap-2">
            <span className={citation.fromHistory ? 'chip chip-pending' : 'chip chip-progress'}>
              {citation.fromHistory ? `Histórico · ${citation.notebookName}` : 'Fuente de esta oportunidad'}
            </span>
            {citation.location && <span className="pill">{citation.location}</span>}
          </div>
          <pre className="rounded-lg bg-surface p-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-text-soft">
            {citation.excerpt}
          </pre>
        </Modal>
      )}
    </div>
  )
}

function Message({ message, onCitation }: { message: ChatMessage; onCitation: (c: Citation) => void }) {
  if (message.role === 'USER') {
    return (
      <div className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[14px] text-white">{message.content}</div>
    )
  }

  const byIndex = new Map(message.citations.map((c) => [c.index, c]))
  // turn [n] markers into links handled by the citation chip renderer
  const content = message.content.replace(/\[(\d+)\]/g, (match, n) => (byIndex.has(Number(n)) ? `[${n}](#cite-${n})` : match))

  return (
    <div className="card self-start px-5 py-4">
      <div className="prose-chat text-text-soft">
        <Markdown
          remarkPlugins={[remarkGfm]}
          // LLM output may carry content injected through the sources: never load images
          // (a URL could exfiltrate data) and only turn our own citation markers into links
          disallowedElements={['img']}
          unwrapDisallowed
          components={{
            a: ({ href, children }) => {
              const index = href?.startsWith('#cite-') ? Number(href.slice(6)) : null
              const cite = index ? byIndex.get(index) : undefined
              if (!cite) return <span className="underline decoration-dotted" title={href}>{children}</span>
              return (
                <button
                  type="button"
                  onClick={() => onCitation(cite)}
                  title={`${cite.filename}${cite.location ? ` · ${cite.location}` : ''}`}
                  className="mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-full px-1 align-middle text-[10.5px] font-bold"
                  style={{
                    background: cite.fromHistory ? 'var(--state-pending-bg)' : 'var(--brand-soft)',
                    color: cite.fromHistory ? 'var(--state-pending-fg)' : 'var(--brand)',
                  }}
                >
                  {index}
                </button>
              )
            },
          }}
        >
          {content}
        </Markdown>
      </div>
      {message.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {message.citations.map((c) => (
            <button key={c.index} type="button" className="pill flex cursor-pointer items-center gap-1 hover:bg-brand-soft" onClick={() => onCitation(c)}>
              {c.fromHistory ? <Archive size={11} /> : <FileText size={11} />}
              <span className="font-semibold">[{c.index}]</span> {c.fromHistory ? `${c.notebookName} · ` : ''}
              {c.filename}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
