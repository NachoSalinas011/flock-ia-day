import { Archive, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorBanner, Spinner } from '../components/Feedback'
import { useNotebooks } from '../hooks/useNotebooks'
import { useProposals } from '../hooks/useProposals'
import { deviationPct, fmt, fmtPct } from '../lib/format'
import type { Notebook } from '../lib/types'

export function HistoryPage() {
  const { data: notebooks, isLoading, error } = useNotebooks('CLOSED')

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-8 pt-8 pb-6">
        <h1 className="text-[26px] font-extrabold text-text">Histórico</h1>
        <p className="mt-1 text-[14px] text-text-soft">
          Proyectos cerrados con su estimación formal y las horas reales. Son la base con la que se calibran las nuevas propuestas.
        </p>
      </header>
      <section className="flex flex-col gap-4 px-8 pb-10">
        {isLoading && <Spinner label="Cargando…" />}
        <ErrorBanner error={error} />
        {notebooks?.length === 0 && (
          <div className="card">
            <EmptyState icon={<Archive size={22} />} title="No hay proyectos cerrados">
              Corré <code className="text-mono">npm run db:seed</code> para cargar los proyectos de ejemplo.
            </EmptyState>
          </div>
        )}
        {notebooks?.map((n) => <HistoryCard key={n.id} notebook={n} />)}
      </section>
    </div>
  )
}

function HistoryCard({ notebook }: { notebook: Notebook }) {
  const { data: proposals } = useProposals(notebook.id)
  const formal = proposals?.flatMap((p) => p.options).find((o) => o.isFormal)
  const estimatedDev = formal?.estimation.devHours ?? 0
  const actualDev = formal?.actual?.devHours ?? null
  const deviation = actualDev !== null ? deviationPct(estimatedDev, actualDev) : null

  return (
    <Link to={`/notebooks/${notebook.id}`} className="card flex flex-col gap-4 p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[16.5px] font-extrabold text-text">{notebook.name}</span>
            {notebook.code && <span className="pill text-mono">{notebook.code}</span>}
          </div>
          <div className="text-[13px] text-text-soft">
            {[notebook.client, notebook.industry, notebook.year].filter(Boolean).join(' · ')}
          </div>
          {notebook.description && <p className="mt-2 max-w-3xl text-[13.5px] text-text-soft">{notebook.description}</p>}
        </div>
        <ArrowRight size={18} className="shrink-0 text-text-faint" />
      </div>
      {formal && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Metric label="Horas dev estimadas" value={fmt(estimatedDev)} />
          <Metric label="Horas dev reales" value={fmt(actualDev)} />
          <Metric
            label="Desvío dev"
            value={fmtPct(deviation)}
            tone={deviation === null ? undefined : deviation > 5 ? 'bad' : 'good'}
          />
          <Metric label="Total propuesto" value={`${fmt(formal.estimation.totalHours)} h`} />
          <Metric label="Duración" value={`${fmt(formal.estimation.team.durationDays)} días`} />
        </div>
      )}
    </Link>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <div className="field-label">{label}</div>
      <div
        className="text-mono text-[18px] font-extrabold"
        style={{ color: tone === 'bad' ? 'var(--state-blocked-fg)' : tone === 'good' ? 'var(--state-done-fg)' : 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  )
}
