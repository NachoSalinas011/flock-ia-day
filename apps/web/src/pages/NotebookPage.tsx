import clsx from 'clsx'
import { ArrowLeft, Boxes, Columns3, Lock, MessageSquare, Sparkles, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBanner, Spinner } from '../components/Feedback'
import { Modal } from '../components/Modal'
import { ChatPanel } from '../features/chat/ChatPanel'
import { ComparisonPanel } from '../features/comparison/ComparisonPanel'
import { ModulesPanel } from '../features/modules/ModulesPanel'
import { ProposalPanel } from '../features/proposals/ProposalPanel'
import type { Generation } from '../features/proposals/GenerateProposal'
import { SourcesPanel } from '../features/sources/SourcesPanel'
import { useDeleteNotebook, useNotebook } from '../hooks/useNotebooks'
import { useGenerateProposal } from '../hooks/useProposals'
import { useSelectedProposal } from '../hooks/useSelectedProposal'
import { useSources } from '../hooks/useSources'

type Tab = 'comparison' | 'proposal' | 'modules' | 'chat'

export function NotebookPage() {
  const { id = '' } = useParams()
  const { data: notebook, isLoading, error } = useNotebook(id)
  const { data: sources } = useSources(id)
  const [chosenTab, setTab] = useState<Tab | null>(null)
  const selection = useSelectedProposal(id)
  const [chatDraft, setChatDraft] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const deleteNotebook = useDeleteNotebook()
  const navigate = useNavigate()
  const generate = useGenerateProposal(id)
  const generation: Generation = {
    isPending: generate.isPending,
    error: generate.error,
    run: (instructions) =>
      generate.mutate(
        { instructions, fresh: Boolean(selection.proposals?.length) },
        {
          onSuccess: (created) => {
            selection.setSelectedId(created.id)
            selection.setTier('BALANCED')
          },
        },
      ),
  }

  if (isLoading) return <div className="p-8"><Spinner label="Cargando…" /></div>
  if (error || !notebook) return <div className="p-8"><ErrorBanner error={error ?? 'No encontrado'} /></div>

  const closed = notebook.status === 'CLOSED'
  const hasReadySources = Boolean(sources?.some((s) => s.status === 'READY'))
  // closed projects have a single (formal) option: nothing to compare
  const tab: Tab = chosenTab ?? (closed ? 'proposal' : 'comparison')
  const tabButton = (key: Tab, icon: ReactNode, label: string) => (
    <button type="button" className={clsx('tab flex items-center gap-2', tab === key && 'tab-active')} onClick={() => setTab(key)}>
      {icon} {label}
    </button>
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 px-6 py-4 text-white" style={{ background: 'var(--brand-gradient)' }}>
        <Link to={closed ? '/historico' : '/'} className="btn btn-icon text-white/80 hover:text-brand" aria-label="Volver">
          <ArrowLeft size={17} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-extrabold">{notebook.name}</h1>
          <div className="text-[12.5px] text-white/70">{[notebook.client, notebook.industry, notebook.year].filter(Boolean).join(' · ')}</div>
        </div>
        {closed && (
          <span className="chip ml-2 bg-white/15 text-white">
            <Lock size={11} /> Proyecto cerrado
          </span>
        )}
        <button
          type="button"
          className="btn ml-auto shrink-0 text-white"
          style={{ background: 'rgba(255,255,255,.14)' }}
          onClick={() => setConfirmingDelete(true)}
          aria-label={closed ? 'Eliminar proyecto' : 'Eliminar oportunidad'}
        >
          <Trash2 size={15} /> Eliminar
        </button>
      </header>

      {confirmingDelete && (
        <Modal
          title={`Eliminar ${closed ? 'proyecto' : 'oportunidad'}`}
          onClose={() => !deleteNotebook.isPending && setConfirmingDelete(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" disabled={deleteNotebook.isPending} onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn text-white"
                style={{ background: 'var(--state-blocked-fg)' }}
                disabled={deleteNotebook.isPending}
                onClick={() =>
                  deleteNotebook.mutate(id, { onSuccess: () => navigate(closed ? '/historico' : '/', { replace: true }) })
                }
              >
                <Trash2 size={15} /> {deleteNotebook.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </>
          }
        >
          <p className="text-[13.5px] text-text-soft">
            Se elimina <b className="text-text">{notebook.name}</b> con todas sus fuentes, el chat y todas las versiones de propuestas. No se puede
            deshacer.
          </p>
          {closed && (
            <p className="chip-pending rounded-lg px-3 py-2 text-[12.5px]">
              Deja de usarse para calibrar las próximas estimaciones. Si viene del seed, vuelve a aparecer al correr{' '}
              <code className="text-mono">npm run db:seed</code>.
            </p>
          )}
          <ErrorBanner error={deleteNotebook.error} />
        </Modal>
      )}

      <div className="flex min-h-0 flex-1">
        <SourcesPanel notebookId={id} readOnly={closed} />
        <section className="flex min-w-0 flex-1 flex-col bg-brand-softer">
          <nav className="sticky top-0 flex border-b border-border bg-panel px-4">
            {!closed && tabButton('comparison', <Columns3 size={15} />, 'Comparativa')}
            {tabButton('proposal', <Sparkles size={15} />, closed ? 'Estimado vs. real' : 'Propuesta')}
            {tabButton('modules', <Boxes size={15} />, 'Módulos identificados')}
            {tabButton('chat', <MessageSquare size={15} />, 'Chat')}
          </nav>
          <div className="min-h-0 flex-1">
            {tab === 'chat' && <ChatPanel notebookId={id} draft={chatDraft} onDraftConsumed={() => setChatDraft(null)} />}
            {tab === 'comparison' && (
              <ComparisonPanel
                notebookId={id}
                readOnly={closed}
                hasReadySources={hasReadySources}
                selection={selection}
                generation={generation}
                onOpenOption={(tier) => {
                  selection.setTier(tier)
                  setTab('proposal')
                }}
              />
            )}
            {tab === 'proposal' && (
              <ProposalPanel
                notebookId={id}
                readOnly={closed}
                hasReadySources={hasReadySources}
                selection={selection}
                generation={generation}
              />
            )}
            {tab === 'modules' && (
              <ModulesPanel
                notebookName={notebook.name}
                selection={selection}
                onAskInChat={(question) => {
                  setChatDraft(question)
                  setTab('chat')
                }}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
