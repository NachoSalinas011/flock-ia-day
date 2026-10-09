import clsx from 'clsx'
import { ChevronDown, ChevronRight, FileText, History, Minus } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useSetOptionModule, useUpdateModule } from '../../hooks/useProposals'
import { deviationPct, fmt, fmtPct, LEVEL_CHIP, LEVEL_LABEL, PRIORITY_CHIP, PRIORITY_LABEL, ROLE_SHORT } from '../../lib/format'
import { DEV_ROLES, type DevRole, type Proposal, type ProposalModule, type ProposalOption } from '../../lib/types'

interface Props {
  proposal: Proposal
  option: ProposalOption
  readOnly?: boolean
}

export function ModulesTable({ proposal, option, readOnly }: Props) {
  const update = useUpdateModule(proposal.notebookId)
  const setModule = useSetOptionModule(proposal.notebookId)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const showActual = Boolean(option.actual)
  const multiOption = proposal.options.length > 1
  const e = option.estimation
  const editableScope = multiOption && !readOnly

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const saveHours = (module: ProposalModule, role: DevRole, value: number) => {
    if (Number.isNaN(value) || value < 0 || value === module.estimatedHours[role]) return
    // edits the hours of the variant in use (shared by every option that uses it)
    const hours = { ...module.estimatedHours, [role]: Math.round(value) }
    update.mutate({
      proposalId: proposal.id,
      moduleId: module.id,
      ...(module.variant === 'REDUCED' ? { reducedHours: hours } : { estimatedHours: hours }),
    })
  }

  return (
    <div className="card overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="min-w-[340px]">Módulo</th>
            {DEV_ROLES.map((role) => (
              <th key={role} className="num">
                {ROLE_SHORT[role]}
              </th>
            ))}
            <th className="num">Total h</th>
            {showActual && <th className="num">Real h</th>}
            {showActual && <th className="num">Desvío</th>}
            <th className="num" title="Jornadas de 8 horas">
              Jorn. FT
            </th>
            <th className="num" title="Jornadas de 4 horas">
              Jorn. PT
            </th>
            {editableScope && <th className="text-center">Alcance</th>}
          </tr>
        </thead>
        <tbody>
          {option.modules.map((module) => {
            const expanded = open.has(module.id)
            const deviation = module.actualTotalHours !== null ? deviationPct(module.totalHours, module.actualTotalHours) : null
            return (
              <Fragment key={module.id}>
                <tr>
                  <td>
                    <button type="button" className="flex cursor-pointer items-start gap-1.5 text-left" onClick={() => toggle(module.id)}>
                      {expanded ? (
                        <ChevronDown size={15} className="mt-0.5 shrink-0 text-text-faint" />
                      ) : (
                        <ChevronRight size={15} className="mt-0.5 shrink-0 text-text-faint" />
                      )}
                      <span>
                        <span className="block font-bold text-text">{module.name}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {multiOption && <span className={clsx('chip', PRIORITY_CHIP[module.priority])}>{PRIORITY_LABEL[module.priority]}</span>}
                          {module.variant === 'REDUCED' && (
                            <span className="chip" style={{ background: 'var(--state-pending-bg)', color: 'var(--accent)' }}>
                              Versión reducida
                            </span>
                          )}
                          <span className={clsx('chip', LEVEL_CHIP[module.complexity])}>Complejidad {LEVEL_LABEL[module.complexity]}</span>
                          <span className="chip chip-pending">Confianza {LEVEL_LABEL[module.confidence]}</span>
                          {module.analogies.length > 0 && (
                            <span className="chip chip-progress">
                              <History size={10} /> {module.analogies.length} analogía{module.analogies.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {module.sourceChunkIds.length > 0 && (
                            <span className="chip chip-pending">
                              <FileText size={10} /> {module.sourceChunkIds.length} cita{module.sourceChunkIds.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </td>
                  {DEV_ROLES.map((role) => (
                    <td key={role} className="num">
                      {readOnly ? (
                        fmt(module.estimatedHours[role])
                      ) : (
                        <input
                          key={`${module.id}-${role}-${module.estimatedHours[role]}`}
                          type="number"
                          min={0}
                          className="input input-cell text-mono"
                          defaultValue={module.estimatedHours[role]}
                          onBlur={(ev) => saveHours(module, role, Number(ev.target.value))}
                          onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                        />
                      )}
                    </td>
                  ))}
                  <td className="num font-bold text-text">{fmt(module.totalHours)}</td>
                  {showActual && <td className="num">{fmt(module.actualTotalHours)}</td>}
                  {showActual && (
                    <td className="num" style={{ color: deviation !== null && deviation > 5 ? 'var(--state-blocked-fg)' : 'var(--state-done-fg)' }}>
                      {fmtPct(deviation)}
                    </td>
                  )}
                  <td className="num">{fmt(module.daysFullTime)}</td>
                  <td className="num">{fmt(module.daysPartTime)}</td>
                  {editableScope && (
                    <td className="text-center whitespace-nowrap">
                      {module.reducedHours && (
                        <div className="inline-flex overflow-hidden rounded-lg border border-border-strong align-middle">
                          {(['FULL', 'REDUCED'] as const).map((variant) => (
                            <button
                              key={variant}
                              type="button"
                              disabled={setModule.isPending}
                              className="cursor-pointer px-2 py-1 text-[11px] font-bold"
                              style={{
                                background: module.variant === variant ? 'var(--brand)' : 'var(--panel)',
                                color: module.variant === variant ? '#fff' : 'var(--text-soft)',
                              }}
                              onClick={() =>
                                module.variant !== variant &&
                                setModule.mutate({ optionId: option.id, moduleId: module.id, included: true, variant })
                              }
                              title={variant === 'REDUCED' ? (module.reducedDescription ?? '') : (module.fullDescription ?? '')}
                            >
                              {variant === 'FULL' ? 'Completo' : 'Reducido'}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-icon ml-1 align-middle"
                        title="Quitar de esta opción"
                        disabled={setModule.isPending}
                        onClick={() => setModule.mutate({ optionId: option.id, moduleId: module.id, included: false })}
                      >
                        <Minus size={14} />
                      </button>
                    </td>
                  )}
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={(showActual ? 10 : 8) + (editableScope ? 1 : 0)} className="bg-surface">
                      <div className="flex flex-col gap-2 py-1 pl-5 text-[13px]">
                        {module.description && <p className="text-text-soft">{module.description}</p>}
                        {module.variant === 'REDUCED' && module.fullDescription && (
                          <p className="text-[12.5px] text-text-faint">
                            <span className="field-label mr-2">Alcance completo</span>
                            {module.fullDescription} ({fmt(Object.values(module.fullHours).reduce((a, b) => a + b, 0))} h)
                          </p>
                        )}
                        {module.notes && (
                          <p className="text-text-soft">
                            <span className="field-label mr-2">{showActual ? 'Notas' : 'Justificación'}</span>
                            {module.notes}
                          </p>
                        )}
                        {module.analogies.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <span className="field-label">Calibrado con el histórico</span>
                            {module.analogies.map((a) => (
                              <div key={`${a.project}-${a.module}`} className="flex flex-wrap items-center gap-2">
                                <span className="pill font-semibold">{a.project}</span>
                                <span className="text-text">{a.module}</span>
                                <span className="text-mono text-text-soft">
                                  {fmt(a.estimatedHours)} h estimadas → {fmt(a.actualHours)} h reales
                                </span>
                                {a.deviationPct !== null && (
                                  <span className={clsx('chip', a.deviationPct > 5 ? 'chip-blocked' : 'chip-done')}>{fmtPct(a.deviationPct)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Desarrollo</td>
            {DEV_ROLES.map((role) => (
              <td key={role} className="num">
                {fmt(e.hoursByRole[role])}
              </td>
            ))}
            <td className="num">{fmt(e.devHours)}</td>
            {showActual && <td className="num">{fmt(option.actual?.devHours)}</td>}
            {showActual && <td className="num">{fmtPct(deviationPct(e.devHours, option.actual?.devHours ?? 0))}</td>}
            <td className="num">{fmt(e.devHours / 8)}</td>
            <td className="num">{fmt(e.devHours / 4)}</td>
            {editableScope && <td />}
          </tr>
        </tfoot>
      </table>
      {(update.error ?? setModule.error) && (
        <div className="px-4 pb-3 text-[12.5px]" style={{ color: 'var(--state-blocked-fg)' }}>
          {(update.error ?? setModule.error)?.message}
        </div>
      )}
    </div>
  )
}
