import { Briefcase, FileText, Plus, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, ErrorBanner, Spinner } from '../components/Feedback'
import { Modal } from '../components/Modal'
import { useCreateNotebook, useNotebooks } from '../hooks/useNotebooks'
import { fmtDate } from '../lib/format'

export function NotebooksPage() {
  const { data: notebooks, isLoading, error } = useNotebooks('ACTIVE')
  const [creating, setCreating] = useState(false)

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-8 pt-8 pb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-extrabold text-text">Oportunidades</h1>
            <p className="mt-1 text-[14px] text-text-soft">
              Cargá las fuentes de cada oportunidad, consultalas con IA y generá la estimación calibrada con el histórico del equipo.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nueva oportunidad
          </button>
        </div>
      </header>

      <section className="px-8 pb-10">
        {isLoading && <Spinner label="Cargando…" />}
        <ErrorBanner error={error} />
        {notebooks?.length === 0 && (
          <div className="card">
            <EmptyState icon={<Briefcase size={22} />} title="Todavía no hay oportunidades">
              Creá una oportunidad, subí el brief del cliente y generá la primera estimación.
            </EmptyState>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notebooks?.map((n) => (
            <Link
              key={n.id}
              to={`/notebooks/${n.id}`}
              className="card group flex flex-col gap-3 border-t-4 border-t-transparent p-5 transition-transform hover:-translate-y-1 hover:border-t-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Briefcase size={20} />
                </div>
                <span className="pill">{fmtDate(n.createdAt)}</span>
              </div>
              <div>
                <div className="text-[16.5px] font-extrabold text-text">{n.name}</div>
                <div className="text-[13px] text-text-soft">{[n.client, n.industry].filter(Boolean).join(' · ') || 'Sin cliente'}</div>
              </div>
              <div className="mt-auto flex gap-2">
                <span className="chip chip-pending">
                  <FileText size={11} /> {n.sourcesCount} fuentes
                </span>
                <span className={n.proposalsCount ? 'chip chip-progress' : 'chip chip-pending'}>
                  <Sparkles size={11} /> {n.proposalsCount} versiones
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {creating && <CreateNotebookModal onClose={() => setCreating(false)} />}
    </div>
  )
}

function CreateNotebookModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateNotebook()
  const [form, setForm] = useState({ name: '', client: '', industry: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(
      { name: form.name.trim(), client: form.client.trim() || undefined, industry: form.industry.trim() || undefined },
      { onSuccess: (notebook) => navigate(`/notebooks/${notebook.id}`) },
    )
  }

  return (
    <Modal
      title="Nueva oportunidad"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="create-notebook" className="btn btn-primary" disabled={!form.name.trim() || create.isPending}>
            Crear
          </button>
        </>
      }
    >
      <form id="create-notebook" onSubmit={submit} className="flex flex-col gap-[15px]">
        <label className="field">
          <span className="field-label">Nombre del proyecto</span>
          <input className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Cliente</span>
          <input className="input" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Industria</span>
          <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        </label>
        <ErrorBanner error={create.error} />
      </form>
    </Modal>
  )
}
