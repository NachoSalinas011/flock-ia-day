import clsx from 'clsx'
import { CheckCircle2, FileQuestion, FileText, MessageSquarePlus } from 'lucide-react'
import { EmptyState, ErrorBanner, Spinner } from '../../components/Feedback'
import type { Proposal, ProposalInsights } from '../../lib/types'
import type { Selection } from './c4Layout'

interface Props {
  proposal: Proposal
  insights: ProposalInsights | undefined
  isLoading: boolean
  error: unknown
  onSelectModule: (selection: Selection) => void
  onAskInChat: (question: string) => void
}

const shortName = (filename: string) => filename.replace(/\.(md|txt|pdf|docx)$/i, '').replace(/^\d+-/, '')

export function CoverageView({ proposal, insights, isLoading, error, onSelectModule, onAskInChat }: Props) {
  if (isLoading) return <Spinner label="Analizando la cobertura de las fuentes…" />
  if (error) return <ErrorBanner error={error} />
  if (!insights) return null

  const moduleName = new Map(proposal.modules.map((m) => [m.id, m.name]))
  const cell = (moduleId: string, sourceId: string) =>
    insights.traceability.find((t) => t.moduleId === moduleId && t.sourceId === sourceId)
  const withoutEvidence = proposal.modules.filter(
    (m) => !insights.traceability.some((t) => t.moduleId === m.id && t.cited + t.related > 0),
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stat-card-hero rounded-xl p-5 shadow-card">
          <div className="text-[11px] font-bold tracking-wide uppercase opacity-80">Cobertura de requisitos</div>
          <div className="text-mono mt-1 text-[30px] font-extrabold">{insights.coveragePct} %</div>
          <div className="text-[12px] opacity-85">de las oraciones de las fuentes se relacionan con algún módulo</div>
        </div>
        <Kpi label="Posibles requisitos sin módulo" value={insights.uncovered.length} tone={insights.uncovered.length ? 'warn' : 'ok'} />
        <Kpi label="Módulos sin evidencia en las fuentes" value={withoutEvidence.length} tone={withoutEvidence.length ? 'warn' : 'ok'} />
      </div>

      <section className="card p-5">
        <h3 className="text-[15px] font-extrabold text-text">Posibles requisitos sin cubrir</h3>
        <p className="mb-3 text-[12.5px] text-text-soft">
          Oraciones de las fuentes que no se parecen a ningún módulo identificado (similitud menor a {Math.round(insights.threshold * 100)} %). Revisalas: pueden ser
          requisitos faltantes, preguntas para el cliente o simplemente contexto.
        </p>
        {insights.uncovered.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={22} />} title="Todo lo que dicen las fuentes está cubierto" />
        ) : (
          <ul className="flex flex-col gap-2">
            {insights.uncovered.map((u) => (
              <li key={`${u.chunkId}-${u.excerpt}`} className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
                <FileQuestion size={16} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-text">“{u.excerpt}”</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-text-faint">
                    <span className="flex items-center gap-1">
                      <FileText size={11} /> {u.filename}
                      {u.location && ` · ${u.location}`}
                    </span>
                    <span className="chip chip-pending">Similitud máx. {Math.round((u.score ?? 0) * 100)} %</span>
                    {u.closestModuleId && (
                      <button type="button" className="cursor-pointer underline-offset-2 hover:underline" onClick={() => onSelectModule({ kind: 'module', key: u.closestModuleId! })}>
                        Más cercano: {moduleName.get(u.closestModuleId)}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-small shrink-0"
                  title="Preguntar en el chat"
                  onClick={() => onAskInChat(`El cliente menciona: "${u.excerpt}". ¿Está contemplado en algún módulo de la propuesta? ¿Cuánto esfuerzo agregaría y qué deberíamos preguntarle?`)}
                >
                  <MessageSquarePlus size={14} /> Analizar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-x-auto p-5">
        <h3 className="text-[15px] font-extrabold text-text">Matriz de trazabilidad</h3>
        <p className="mb-3 text-[12.5px] text-text-soft">
          Qué fuente respalda cada módulo. <b className="text-brand">●</b> fragmentos citados por la IA · <b className="text-text-faint">○</b> fragmentos
          semánticamente relacionados.
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>Módulo</th>
              {insights.sources.map((s) => (
                <th key={s.sourceId} className="text-center" title={s.filename}>
                  {shortName(s.filename)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposal.modules.map((m) => {
              const empty = withoutEvidence.includes(m)
              return (
                <tr key={m.id}>
                  <td>
                    <button type="button" className="cursor-pointer text-left font-semibold text-text hover:text-brand" onClick={() => onSelectModule({ kind: 'module', key: m.id })}>
                      {m.name}
                    </button>
                    {empty && <span className="chip chip-blocked ml-2">sin evidencia</span>}
                  </td>
                  {insights.sources.map((s) => {
                    const c = cell(m.id, s.sourceId)
                    const total = (c?.cited ?? 0) + (c?.related ?? 0)
                    return (
                      <td key={s.sourceId} className="text-center">
                        <span
                          className={clsx('text-mono inline-flex min-w-[54px] justify-center rounded-md px-2 py-1 text-[12px] font-bold')}
                          style={{
                            background: c?.cited ? 'var(--brand-soft)' : total ? 'var(--surface)' : 'transparent',
                            color: c?.cited ? 'var(--brand)' : 'var(--text-faint)',
                          }}
                        >
                          {total ? `${'●'.repeat(c?.cited ?? 0)}${'○'.repeat(c?.related ?? 0)}` : '·'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' }) {
  return (
    <div className="card p-5">
      <div className="field-label flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: tone === 'warn' ? 'var(--accent)' : 'var(--state-done-fg)' }} /> {label}
      </div>
      <div className="text-mono mt-1 text-[28px] font-extrabold text-text">{value}</div>
    </div>
  )
}
