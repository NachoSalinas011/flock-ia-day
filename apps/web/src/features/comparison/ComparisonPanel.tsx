import clsx from 'clsx'
import { ArrowRight, CalendarClock, CheckCircle2, Columns3, RotateCcw, Star, TriangleAlert, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { EmptyState, ErrorBanner, Spinner } from '../../components/Feedback'
import { useMarkFormal, useSetOptionModule, useUpdateTarget } from '../../hooks/useProposals'
import type { SelectedProposal } from '../../hooks/useSelectedProposal'
import { fmt, fmtDay, localToday, PRIORITY_CHIP, PRIORITY_LABEL, TIER_DESCRIPTION, teamSize, unstaffedText } from '../../lib/format'
import type { Proposal, ProposalModule, ProposalOption, Tier } from '../../lib/types'
import { GenerateProposalButton, GeneratingBanner, type Generation } from '../proposals/GenerateProposal'
import { VersionChips } from '../proposals/VersionChips'

interface Props {
  notebookId: string
  readOnly?: boolean
  hasReadySources: boolean
  selection: SelectedProposal
  generation: Generation
  onOpenOption: (tier: Tier) => void
}

export function ComparisonPanel({ notebookId, readOnly, hasReadySources, selection, generation: generate, onOpenOption }: Props) {
  const { proposals, proposal, setSelectedId } = selection
  const markFormal = useMarkFormal(notebookId)

  if (!proposals) return <div className="p-6"><Spinner label="Cargando…" /></div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-6 py-3">
        <VersionChips proposals={proposals} selectedId={proposal?.id ?? null} onSelect={setSelectedId} />
        <div className="flex-1" />
        {!readOnly && (
          <GenerateProposalButton
            hasReadySources={hasReadySources}
            isPending={generate.isPending}
            isFirst={!proposals.length}
            onGenerate={generate.run}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <ErrorBanner error={generate.error ?? markFormal.error} />
          {generate.isPending && <GeneratingBanner />}
          {!proposal && !generate.isPending && (
            <div className="card">
              <EmptyState icon={<Columns3 size={22} />} title="Todavía no hay propuestas">
                {hasReadySources
                  ? 'Generá las propuestas: MVP, Equilibrada y Completa, calibradas con el histórico, para que el cliente elija.'
                  : 'Cargá al menos una fuente para poder generar las propuestas.'}
              </EmptyState>
            </div>
          )}
          {proposal && (
            <>
              {!readOnly && <TargetBar key={proposal.id} proposal={proposal} notebookId={notebookId} />}
              <div className={clsx('grid grid-cols-1 gap-4', proposal.options.length === 3 && 'lg:grid-cols-3')}>
                {proposal.options.map((option) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    readOnly={readOnly}
                    onOpen={() => onOpenOption(option.tier)}
                    onMakeFormal={() => markFormal.mutate(option.id)}
                    formalPending={markFormal.isPending}
                  />
                ))}
              </div>
              <ScopeMatrix proposal={proposal} notebookId={notebookId} readOnly={readOnly} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TargetBar({ proposal, notebookId }: { proposal: Proposal; notebookId: string }) {
  const update = useUpdateTarget(notebookId)
  const current = proposal.targetDate ? proposal.targetDate.slice(0, 10) : ''
  const [value, setValue] = useState(current)

  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <CalendarClock size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="field-label">Fecha objetivo (define la opción Equilibrada)</div>
        <div className="text-[15px] font-extrabold text-text">
          {fmtDay(proposal.targetDate)} <span className="text-mono text-[13px] font-semibold text-text-soft">· {fmt(proposal.targetDays)} días hábiles desde hoy</span>
        </div>
        {proposal.targetSource && <div className="truncate text-[12px] text-text-faint">“{proposal.targetSource}”</div>}
      </div>
      <input type="date" className="input" value={value} min={localToday()} onChange={(e) => setValue(e.target.value)} />
      <button
        type="button"
        className="btn btn-primary"
        disabled={!value || value === current || update.isPending}
        onClick={() => update.mutate({ proposalId: proposal.id, targetDate: value })}
      >
        Aplicar y reajustar
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={update.isPending}
        title="Volver a una fecha estimada a partir de la opción Completa"
        onClick={() => update.mutate({ proposalId: proposal.id, targetDate: null }, { onSuccess: (p) => setValue(p.targetDate?.slice(0, 10) ?? '') })}
      >
        <RotateCcw size={14} /> Estimada
      </button>
      {update.error && <div className="w-full"><ErrorBanner error={update.error} /></div>}
    </div>
  )
}

function OptionCard({
  option,
  readOnly,
  onOpen,
  onMakeFormal,
  formalPending,
}: {
  option: ProposalOption
  readOnly?: boolean
  onOpen: () => void
  onMakeFormal: () => void
  formalPending: boolean
}) {
  const e = option.estimation
  const reduced = option.modules.filter((m) => m.variant === 'REDUCED').length
  const { fits, targetDays, durationDays } = option.target
  const unstaffed = option.target.unstaffedRoles ?? []
  const balanced = option.tier === 'BALANCED'

  return (
    <div
      className={clsx('card flex flex-col gap-4 p-5', option.isFormal && 'ring-2 ring-brand')}
      style={balanced ? { borderTop: '4px solid var(--brand)' } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[19px] font-extrabold text-text">{option.label}</div>
          <div className="text-[12.5px] text-text-soft">{TIER_DESCRIPTION[option.tier]}</div>
        </div>
        {option.isFormal && (
          <span className="chip chip-done">
            <Star size={10} fill="currentColor" /> Elegida
          </span>
        )}
      </div>

      <div className={clsx('rounded-xl p-4', balanced ? 'stat-card-hero' : 'bg-surface')}>
        <div className={clsx('text-[11px] font-bold tracking-wide uppercase', balanced ? 'opacity-80' : 'text-text-faint')}>Esfuerzo total</div>
        <div className={clsx('text-mono text-[28px] font-extrabold', !balanced && 'text-text')}>{fmt(e.totalHours)} h</div>
        <div className={clsx('text-mono text-[12px]', balanced ? 'opacity-85' : 'text-text-soft')}>
          Dev {fmt(e.devHours)} · PM {fmt(e.pmHours)} · Cont. {fmt(e.contingencyHours)}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-[13px]">
        <Metric label="Duración" value={`${fmt(e.team.durationDays)} días`} hint={e.team.durationDays ? `≈ ${fmt(e.team.durationDays / 5)} semanas` : 'Falta asignar roles'} />
        <Metric label="Equipo" value={`${teamSize(option.team)} personas`} icon={<Users size={12} />} />
        <Metric label="Todo full time" value={`${fmt(e.allFullTime.durationDays)} días`} />
        <Metric label="Todo part time" value={`${fmt(e.allPartTime.durationDays)} días`} />
        <Metric label="Módulos" value={`${option.modules.length}`} hint={reduced ? `${reduced} en versión reducida` : 'Todos completos'} />
        <Metric label="No incluye" value={`${option.excludedModules.length}`} hint={option.excludedModules.slice(0, 2).map((m) => m.name).join(', ') || '—'} />
      </dl>

      {unstaffed.length > 0 ? (
        <div className="chip-blocked flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold">
          <TriangleAlert size={15} className="shrink-0" />
          {unstaffedText(unstaffed)}
        </div>
      ) : fits !== null && targetDays !== null && (
        <div className={clsx('flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold', fits ? 'chip-done' : 'chip-blocked')}>
          {fits ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />}
          {fits
            ? `Entra en la fecha objetivo (${targetDays - (durationDays ?? 0)} días de margen)`
            : `Se pasa ${(durationDays ?? 0) - targetDays} días de la fecha objetivo`}
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <button type="button" className="btn btn-ghost flex-1 justify-center" onClick={onOpen}>
          Ver detalle <ArrowRight size={14} />
        </button>
        {!readOnly && !option.isFormal && (
          <button type="button" className="btn btn-small" disabled={formalPending} onClick={onMakeFormal} title="Marcar como la opción elegida por el cliente">
            <Star size={13} /> Elegir
          </button>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: ReactNode }) {
  return (
    <div>
      <dt className="field-label flex items-center gap-1">
        {icon} {label}
      </dt>
      <dd className="text-mono text-[15px] font-extrabold text-text">{value}</dd>
      {hint && <dd className="truncate text-[11.5px] text-text-faint" title={hint}>{hint}</dd>}
    </div>
  )
}

/** Module × option matrix; clicking a cell cycles excluded → full → reduced. */
function ScopeMatrix({ proposal, notebookId, readOnly }: { proposal: Proposal; notebookId: string; readOnly?: boolean }) {
  const setModule = useSetOptionModule(notebookId)
  if (proposal.options.length < 2) return null

  const cycle = (option: ProposalOption, module: ProposalModule) => {
    const current = option.modules.find((m) => m.id === module.id)
    if (!current) return setModule.mutate({ optionId: option.id, moduleId: module.id, included: true, variant: 'FULL' })
    if (current.variant === 'FULL' && module.reducedHours)
      return setModule.mutate({ optionId: option.id, moduleId: module.id, included: true, variant: 'REDUCED' })
    setModule.mutate({ optionId: option.id, moduleId: module.id, included: false })
  }

  return (
    <section className="card overflow-x-auto p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-extrabold text-text">Alcance de cada opción</h3>
          <p className="text-[12.5px] text-text-soft">
            {readOnly
              ? 'Qué incluye cada opción.'
              : 'Tocá una celda para ajustar: no incluido → completo → reducido. Todo se recalcula al instante.'}
          </p>
        </div>
        {setModule.isPending && <span className="text-[12px] text-text-faint">Recalculando…</span>}
      </div>
      <ErrorBanner error={setModule.error} />
      <table className="data-table">
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Prioridad</th>
            {proposal.options.map((o) => (
              <th key={o.id} className="text-center">
                {o.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {proposal.modules.map((module) => (
            <tr key={module.id}>
              <td>
                <div className="font-semibold text-text">{module.name}</div>
                <div className="text-mono text-[11.5px] text-text-faint">
                  {fmt(module.totalHours)} h completo
                  {module.reducedHours && ` · ${fmt(Object.values(module.reducedHours).reduce((a, b) => a + b, 0))} h reducido`}
                </div>
              </td>
              <td>
                <span className={clsx('chip', PRIORITY_CHIP[module.priority])}>{PRIORITY_LABEL[module.priority]}</span>
              </td>
              {proposal.options.map((option) => {
                const included = option.modules.find((m) => m.id === module.id)
                return (
                  <td key={option.id} className="text-center">
                    <button
                      type="button"
                      disabled={readOnly || setModule.isPending}
                      onClick={() => cycle(option, module)}
                      title={included?.variant === 'REDUCED' ? (module.reducedDescription ?? '') : ''}
                      className={clsx(
                        'text-mono inline-flex min-w-[110px] cursor-pointer whitespace-nowrap items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors disabled:cursor-default',
                        !included && 'text-text-faint hover:bg-surface',
                      )}
                      style={
                        included
                          ? included.variant === 'REDUCED'
                            ? { background: 'var(--state-pending-bg)', color: 'var(--accent)' }
                            : { background: 'var(--brand-soft)', color: 'var(--brand)' }
                          : undefined
                      }
                    >
                      {included ? (included.variant === 'REDUCED' ? `Reducido · ${included.totalHours} h` : `✓ ${included.totalHours} h`) : '—'}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Horas de desarrollo</td>
            {proposal.options.map((o) => (
              <td key={o.id} className="text-mono text-center">
                {fmt(o.estimation.devHours)} h
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={2}>Duración con su equipo</td>
            {proposal.options.map((o) => (
              <td key={o.id} className="text-mono text-center">
                {fmt(o.estimation.team.durationDays)} días
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
