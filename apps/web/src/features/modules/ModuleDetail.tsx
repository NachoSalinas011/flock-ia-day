import clsx from 'clsx'
import { ArrowRight, Cloud, FileText, GitCompare, Link2, Plug, Sparkles, User, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Spinner } from '../../components/Feedback'
import { fmt, fmtPct, LEVEL_CHIP, LEVEL_LABEL, ROLE_LABEL } from '../../lib/format'
import { DEV_ROLES, type ChunkRef, type Proposal, type ProposalInsights, type ProposalModule } from '../../lib/types'
import type { ModuleDiffRow } from '../../lib/moduleDiff'
import type { Selection } from './c4Layout'

interface Props {
  proposal: Proposal
  selection: NonNullable<Selection>
  insights: ProposalInsights | undefined
  insightsLoading: boolean
  onSelect: (selection: Selection) => void
  /** set when a comparison is active; row is null for modules outside it */
  comparison: { row: ModuleDiffRow | null; baseLabel: string; targetLabel: string } | null
  /** modules as included in the option being viewed */
  scopeModules?: ProposalModule[]
}

export function ModuleDetail({ proposal, selection, insights, insightsLoading, onSelect, comparison, scopeModules }: Props) {
  const { architecture: arch, modules } = proposal
  const close = (
    <button type="button" className="btn btn-icon" onClick={() => onSelect(null)} aria-label="Cerrar detalle">
      <X size={15} />
    </button>
  )
  const moduleLink = (id: string, name: string) => (
    <button key={id} type="button" className="pill cursor-pointer hover:bg-brand-soft" onClick={() => onSelect({ kind: 'module', key: id })}>
      {name}
    </button>
  )

  if (selection.kind !== 'module') {
    const item =
      selection.kind === 'external'
        ? arch.externalSystems.find((s) => s.key === selection.key)
        : selection.kind === 'actor'
          ? arch.actors.find((a) => a.key === selection.key)
          : arch.containers.find((c) => c.key === selection.key)
    if (!item) return null
    const related =
      selection.kind === 'external'
        ? modules.filter((m) => m.integrations.includes(selection.key))
        : selection.kind === 'container'
          ? modules.filter((m) => m.containerKey === selection.key)
          : []
    const container = selection.kind === 'container' ? arch.containers.find((c) => c.key === selection.key) : null
    return (
      <Panel
        icon={selection.kind === 'external' ? <Cloud size={16} /> : selection.kind === 'actor' ? <User size={16} /> : <Sparkles size={16} />}
        eyebrow={selection.kind === 'external' ? 'Sistema externo' : selection.kind === 'actor' ? 'Actor' : `Contenedor · ${container?.technology}`}
        title={item.name}
        action={close}
      >
        <p className="text-[13px] text-text-soft">{item.description}</p>
        {related.length > 0 && (
          <Section title={selection.kind === 'external' ? 'Módulos que lo integran' : 'Módulos que aloja'}>
            <div className="flex flex-wrap gap-1.5">{related.map((m) => moduleLink(m.id, `${m.name} · ${m.totalHours} h`))}</div>
            <div className="text-mono text-[12px] text-text-faint">
              Total: {fmt(related.reduce((acc, m) => acc + m.totalHours, 0))} h
            </div>
          </Section>
        )}
        {selection.kind === 'external' && (
          <p className="rounded-lg bg-surface p-3 text-[12px] text-text-soft">
            Lección del histórico: las integraciones con terceros y sistemas legacy se desviaron ~40 %. Revisá que sus módulos tengan el factor aplicado.
          </p>
        )}
      </Panel>
    )
  }

  // removed modules (ghosts) only exist in the comparison base
  const removedRow = comparison?.row?.status === 'removed' ? comparison.row : null
  if (removedRow?.before) {
    return (
      <Panel icon={<GitCompare size={16} />} eyebrow={`Eliminado en ${comparison!.targetLabel}`} title={removedRow.before.name} action={close}>
        <ComparisonSection row={removedRow} baseLabel={comparison!.baseLabel} targetLabel={comparison!.targetLabel} />
        {removedRow.before.description && <p className="text-[13px] text-text-soft">{removedRow.before.description}</p>}
      </Panel>
    )
  }

  // prefer the option's view of the module (reduced description and hours when it uses that variant)
  const module = scopeModules?.find((m) => m.id === selection.key) ?? modules.find((m) => m.id === selection.key)
  if (!module) return null
  const container = arch.containers.find((c) => c.key === module.containerKey)
  const evidence = insights?.modules.find((m) => m.moduleId === module.id)
  const dependsOn = modules.filter((m) => module.dependsOn.includes(m.name))
  const dependents = modules.filter((m) => m.dependsOn.includes(module.name))
  const externals = arch.externalSystems.filter((s) => module.integrations.includes(s.key))

  return (
    <Panel icon={<Sparkles size={16} />} eyebrow={container ? `Módulo · ${container.name}` : 'Módulo'} title={module.name} action={close}>
      {comparison?.row && (
        <ComparisonSection row={comparison.row} baseLabel={comparison.baseLabel} targetLabel={comparison.targetLabel} />
      )}
      <div className="flex flex-wrap gap-1.5">
        <span className={clsx('chip', LEVEL_CHIP[module.complexity])}>Complejidad {LEVEL_LABEL[module.complexity]}</span>
        <span className="chip chip-pending">Confianza {LEVEL_LABEL[module.confidence]}</span>
      </div>
      {module.description && <p className="text-[13px] text-text-soft">{module.description}</p>}

      <Section title="Esfuerzo">
        <div className="grid grid-cols-4 gap-1.5">
          {DEV_ROLES.map((role) => (
            <div key={role} className="rounded-lg bg-surface px-2 py-1.5 text-center">
              <div className="text-[10px] font-bold text-text-faint uppercase">{ROLE_LABEL[role]}</div>
              <div className="text-mono text-[14px] font-extrabold text-text">{module.estimatedHours[role]}</div>
            </div>
          ))}
        </div>
        <div className="text-mono flex justify-between text-[12px] text-text-soft">
          <span>
            <b className="text-text">{fmt(module.totalHours)} h</b>
          </span>
          <span>
            {fmt(module.daysFullTime)} jornadas FT · {fmt(module.daysPartTime)} PT
          </span>
        </div>
        {module.notes && <p className="text-[12.5px] text-text-soft">{module.notes}</p>}
      </Section>

      <Section title="Origen en las fuentes">
        {insightsLoading && <Spinner label="Buscando evidencia…" />}
        {evidence && evidence.cited.length === 0 && evidence.related.length === 0 && (
          <p className="chip-blocked rounded-lg px-3 py-2 text-[12.5px]">Ninguna fuente respalda este módulo: validalo con el cliente.</p>
        )}
        {evidence?.cited.map((ref) => <Evidence key={ref.chunkId} reference={ref} kind="cited" />)}
        {evidence?.related.map((ref) => <Evidence key={ref.chunkId} reference={ref} kind="related" />)}
      </Section>

      {module.analogies.length > 0 && (
        <Section title="Calibrado con el histórico">
          {module.analogies.map((a) => (
            <div key={`${a.project}-${a.module}`} className="rounded-lg bg-surface px-3 py-2 text-[12.5px]">
              <div className="font-semibold text-text">
                {a.project} · {a.module}
              </div>
              <div className="text-mono flex items-center gap-2 text-text-soft">
                {fmt(a.estimatedHours)} h est. → {fmt(a.actualHours)} h reales
                {a.deviationPct !== null && (
                  <span className={clsx('chip', a.deviationPct > 20 ? 'chip-blocked' : a.deviationPct > 5 ? 'chip-progress' : 'chip-done')}>
                    {fmtPct(a.deviationPct)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {(dependsOn.length > 0 || dependents.length > 0 || externals.length > 0) && (
        <Section title="Relaciones">
          {dependsOn.length > 0 && (
            <Relation icon={<Link2 size={12} />} label="Depende de">
              {dependsOn.map((m) => moduleLink(m.id, m.name))}
            </Relation>
          )}
          {dependents.length > 0 && (
            <Relation icon={<Link2 size={12} />} label="Lo usan">
              {dependents.map((m) => moduleLink(m.id, m.name))}
            </Relation>
          )}
          {externals.length > 0 && (
            <Relation icon={<Plug size={12} />} label="Integra con">
              {externals.map((s) => (
                <button key={s.key} type="button" className="pill cursor-pointer hover:bg-brand-soft" onClick={() => onSelect({ kind: 'external', key: s.key })}>
                  {s.name}
                </button>
              ))}
            </Relation>
          )}
        </Section>
      )}
    </Panel>
  )
}

function Panel({ icon, eyebrow, title, action, children }: { icon: ReactNode; eyebrow: string; title: string; action: ReactNode; children: ReactNode }) {
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-panel">
      <div className="flex items-start gap-2 border-b border-border px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="field-label">{eyebrow}</div>
          <div className="text-[15px] leading-tight font-extrabold text-text">{title}</div>
        </div>
        {action}
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">{children}</div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="field-label">{title}</h4>
      {children}
    </section>
  )
}

function Relation({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[12px] font-semibold text-text-soft">
        {icon} {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Evidence({ reference, kind }: { reference: ChunkRef; kind: 'cited' | 'related' }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-border-strong"
    >
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text">
        <FileText size={12} className="shrink-0 text-brand" />
        <span className="truncate">{reference.filename}</span>
        <span className={clsx('chip ml-auto shrink-0', kind === 'cited' ? 'chip-progress' : 'chip-pending')}>
          {kind === 'cited' ? 'Citado por la IA' : `Relacionado ${Math.round((reference.score ?? 0) * 100)} %`}
        </span>
      </span>
      {reference.location && <span className="text-[11px] text-text-faint">{reference.location}</span>}
      <span className={clsx('text-[12px] whitespace-pre-wrap text-text-soft', !open && 'line-clamp-3')}>{reference.excerpt}</span>
    </button>
  )
}

const STATUS_LABEL = { added: 'Nuevo', removed: 'Eliminado', changed: 'Modificado', same: 'Sin cambios' } as const
const STATUS_CHIP = { added: 'chip-done', removed: 'chip-blocked', changed: 'chip-progress', same: 'chip-pending' } as const
const toneColor = (tone: 'up' | 'down' | 'neutral') =>
  tone === 'up' ? 'var(--state-blocked-fg)' : tone === 'down' ? 'var(--state-done-fg)' : 'var(--accent)'
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`

/** What changed in this module: plain-language sentences + field-by-field before/after. */
function ComparisonSection({ row, baseLabel, targetLabel }: { row: ModuleDiffRow; baseLabel: string; targetLabel: string }) {
  const before = row.before
  const after = row.after
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border-2 p-3" style={{ borderColor: row.status === 'same' ? 'var(--border)' : 'var(--accent)' }}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="field-label flex items-center gap-1.5">
          <GitCompare size={12} /> Cambios vs {baseLabel}
        </h4>
        <span className={clsx('chip', STATUS_CHIP[row.status])}>{STATUS_LABEL[row.status]}</span>
      </div>

      {row.sentences.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {row.sentences.map((sentence) => (
            <li key={sentence} className="flex gap-2 text-[13px] font-semibold text-text">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} /> {sentence}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] text-text-soft">Este módulo es igual en las dos opciones.</p>
      )}

      {row.changes.length > 0 && (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10.5px] font-bold text-text-faint uppercase">
              <th className="pb-1">Campo</th>
              <th className="pb-1">{baseLabel}</th>
              <th />
              <th className="pb-1">{targetLabel}</th>
            </tr>
          </thead>
          <tbody>
            {row.changes.map((c) => (
              <tr key={c.field} className="border-t border-border">
                <td className="py-1 pr-2 font-semibold text-text-soft">{c.label}</td>
                <td className="py-1 pr-1 text-text-faint line-through">{c.before}</td>
                <td className="py-1 pr-1 text-text-faint">
                  <ArrowRight size={11} />
                </td>
                <td className="py-1 font-bold" style={{ color: toneColor(c.tone) }}>
                  {c.after}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(before || after) && row.status !== 'same' && (
        <div className="grid grid-cols-4 gap-1.5">
          {DEV_ROLES.map((role) => {
            const delta = row.deltaByRole[role]
            return (
              <div
                key={role}
                className="rounded-lg px-2 py-1.5 text-center"
                style={{ background: delta > 0 ? 'var(--state-blocked-bg)' : delta < 0 ? 'var(--state-done-bg)' : 'var(--surface)' }}
              >
                <div className="text-[10px] font-bold text-text-faint uppercase">{ROLE_LABEL[role]}</div>
                <div className="text-mono text-[11px] text-text-faint">
                  {before?.estimatedHours[role] ?? 0} → {after?.estimatedHours[role] ?? 0}
                </div>
                <div className="text-mono text-[13px] font-extrabold" style={{ color: delta ? toneColor(delta > 0 ? 'up' : 'down') : 'var(--text-faint)' }}>
                  {delta ? signed(delta) : '='}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
