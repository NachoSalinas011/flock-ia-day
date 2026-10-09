import clsx from 'clsx'
import { CalendarClock, CheckCircle2, Download, Plus, Sparkles, Star, Trash2, TriangleAlert, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, ErrorBanner, Spinner } from '../../components/Feedback'
import { Modal } from '../../components/Modal'
import { useDeleteProposal, useMarkFormal, useReplan, useSetOptionModule } from '../../hooks/useProposals'
import type { SelectedProposal } from '../../hooks/useSelectedProposal'
import { api } from '../../lib/api'
import { fmt, fmtDate, fmtDay, PRIORITY_CHIP, PRIORITY_LABEL, TIER_DESCRIPTION, unstaffedText } from '../../lib/format'
import type { Proposal, ProposalOption } from '../../lib/types'
import { GenerateProposalButton, GeneratingBanner, type Generation } from './GenerateProposal'
import { ModulesTable } from './ModulesTable'
import { OptionTabs } from './OptionTabs'
import { TeamEditor } from './TeamEditor'
import { VersionChips } from './VersionChips'

interface Props {
  notebookId: string
  readOnly?: boolean
  hasReadySources: boolean
  selection: SelectedProposal
  generation: Generation
}

export function ProposalPanel({ notebookId, readOnly, hasReadySources, selection, generation: generate }: Props) {
  const { proposals, proposal, option, setSelectedId, tier, setTier } = selection
  const markFormal = useMarkFormal(notebookId)
  const remove = useDeleteProposal(notebookId)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!proposals) return <div className="p-6"><Spinner label="Cargando propuestas…" /></div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-6 py-3">
        <VersionChips proposals={proposals} selectedId={proposal?.id ?? null} onSelect={setSelectedId} />
        {proposal && <OptionTabs options={proposal.options} tier={tier} onSelect={setTier} />}
        <div className="flex-1" />
        {option && !readOnly && (
          <>
            <button type="button" className="btn btn-ghost" disabled={option.isFormal || markFormal.isPending} onClick={() => markFormal.mutate(option.id)}>
              <Star size={15} /> {option.isFormal ? 'Opción elegida' : 'Elegir esta opción'}
            </button>
            <button
              type="button"
              className="btn btn-icon"
              title="Eliminar esta versión (las 3 opciones)"
              disabled={remove.isPending}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
        {proposal && (
          <a className="btn btn-ghost" href={api.proposals.exportUrl(proposal.id)}>
            <Download size={15} /> Exportar
          </a>
        )}
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
          <ErrorBanner error={generate.error ?? markFormal.error ?? remove.error} />
          {generate.isPending && <GeneratingBanner />}
          {!proposal && !generate.isPending && (
            <div className="card">
              <EmptyState icon={<Sparkles size={22} />} title="Todavía no hay propuestas">
                {hasReadySources
                  ? 'Generá las propuestas: módulos, horas por rol, equipo y duración para MVP, Equilibrada y Completa.'
                  : 'Cargá al menos una fuente para poder generar las propuestas.'}
              </EmptyState>
            </div>
          )}
          {proposal && option && <OptionView proposal={proposal} option={option} readOnly={readOnly} />}
        </div>
      </div>

      {confirmingDelete && proposal && (
        <DeleteVersionModal
          proposal={proposal}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false)
            remove.mutate(proposal.id, { onSuccess: () => setSelectedId(null) })
          }}
        />
      )}
    </div>
  )
}

function DeleteVersionModal({ proposal, onCancel, onConfirm }: { proposal: Proposal; onCancel: () => void; onConfirm: () => void }) {
  const formal = proposal.options.find((o) => o.isFormal)
  const many = proposal.options.length > 1
  return (
    <Modal
      title={`Eliminar versión v${proposal.version}`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="btn" style={{ background: 'var(--state-blocked-fg)', color: '#fff' }} onClick={onConfirm}>
            <Trash2 size={15} /> Eliminar
          </button>
        </>
      }
    >
      <p className="text-[13.5px] text-text-soft">
        Se elimina la versión v{proposal.version} completa
        {many ? <>, con sus {proposal.options.length} opciones ({proposal.options.map((o) => o.label).join(', ')})</> : null}, y todos los ajustes
        hechos sobre ella. No se puede deshacer.
      </p>
      {formal && (
        <div className="chip-blocked flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold">
          <TriangleAlert size={15} className="shrink-0" />
          {many ? `Incluye la opción elegida por el cliente (${formal.label}).` : 'Es la propuesta formal del proyecto.'}
        </div>
      )}
    </Modal>
  )
}

function OptionView({ proposal, option, readOnly }: { proposal: Proposal; option: ProposalOption; readOnly?: boolean }) {
  const e = option.estimation
  const multiOption = proposal.options.length > 1
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stat-card-hero rounded-xl p-5 shadow-card">
          <div className="text-[11px] font-bold tracking-wide uppercase opacity-80">
            {multiOption ? `Opción ${option.label}` : 'Esfuerzo total'}
          </div>
          <div className="text-mono mt-1 text-[30px] font-extrabold">{fmt(e.totalHours)} h</div>
          <div className="mt-1 text-[12px] opacity-85">
            Dev {fmt(e.devHours)} · PM {fmt(e.pmHours)} · Contingencia {fmt(e.contingencyHours)}
          </div>
        </div>
        <Stat label="Duración con este equipo" value={e.team.durationDays} unit="días hábiles" hint={e.team.durationDays ? `≈ ${fmt(e.team.durationDays / 5)} semanas` : 'Falta asignar roles'} />
        <Stat label="Todo el equipo full time" value={e.allFullTime.durationDays} unit="días" hint="Jornadas de 8 h" dot="var(--brand)" />
        <Stat label="Todo el equipo part time" value={e.allPartTime.durationDays} unit="días" hint="Jornadas de 4 h" dot="var(--accent)" />
      </div>

      {multiOption && <TargetStatus proposal={proposal} option={option} readOnly={readOnly} />}

      <div className="card p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-extrabold text-text">Resumen</h3>
          {option.isFormal && (
            <span className="chip chip-done">
              <Star size={10} fill="currentColor" /> {multiOption ? 'Opción elegida por el cliente' : 'Formal'}
            </span>
          )}
          <span className="pill">v{proposal.version} · {fmtDate(proposal.createdAt)}</span>
        </div>
        {multiOption && <p className="mb-1 text-[13.5px] font-semibold text-text">{TIER_DESCRIPTION[option.tier]}.</p>}
        <p className="text-[14px] text-text-soft">{proposal.summary}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-[15px] font-extrabold text-text">Módulos incluidos</h3>
        <ModulesTable proposal={proposal} option={option} readOnly={readOnly} />
        <p className="text-[12px] text-text-faint">
          Horas equivalentes Ssr. Un Jr rinde ×1/1,3 y un Sr ×1/0,8. Jornada FT = 8 h, PT = 4 h. Las horas se pueden editar y todo se recalcula.
        </p>
        {option.excludedModules.length > 0 && <ExcludedModules option={option} readOnly={readOnly} />}
      </div>

      <TeamEditor option={option} readOnly={readOnly} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListCard title="Preguntas abiertas para el cliente" items={proposal.openQuestions} accent />
        <ListCard title="Riesgos" items={proposal.risks} />
        <ListCard title="Supuestos" items={proposal.assumptions} />
        <ListCard title="Fuera de alcance" items={proposal.outOfScope} />
        {proposal.lessons.length > 0 && <ListCard title="Lecciones aprendidas" items={proposal.lessons} accent />}
      </div>
    </>
  )
}

function TargetStatus({ proposal, option, readOnly }: { proposal: Proposal; option: ProposalOption; readOnly?: boolean }) {
  const replan = useReplan(option.notebookId)
  const { fits, targetDays, durationDays } = option.target
  const unstaffed = option.target.unstaffedRoles ?? []
  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <CalendarClock size={18} className="text-brand" />
      <span className="text-[13.5px] text-text">
        Fecha objetivo <b>{fmtDay(proposal.targetDate)}</b>
        <span className="text-mono text-text-soft"> · {fmt(targetDays)} días hábiles</span>
      </span>
      {unstaffed.length > 0 ? (
        <span className="chip chip-blocked">
          <TriangleAlert size={11} /> {unstaffedText(unstaffed)}
        </span>
      ) : fits !== null && (
        <span className={clsx('chip', fits ? 'chip-done' : 'chip-blocked')}>
          {fits ? <CheckCircle2 size={11} /> : <TriangleAlert size={11} />}
          {fits ? `Entra con ${(targetDays ?? 0) - (durationDays ?? 0)} días de margen` : `Se pasa ${(durationDays ?? 0) - (targetDays ?? 0)} días`}
        </span>
      )}
      <div className="flex-1" />
      {option.tier === 'BALANCED' && !readOnly && (
        <button
          type="button"
          className="btn btn-small"
          disabled={replan.isPending}
          onClick={() => replan.mutate(option.id)}
          title="Vuelve a elegir qué módulos entran en la fecha, con el equipo actual"
        >
          <Wand2 size={14} /> {replan.isPending ? 'Reajustando…' : 'Ajustar alcance a la fecha'}
        </button>
      )}
      {replan.error && <div className="w-full"><ErrorBanner error={replan.error} /></div>}
    </div>
  )
}

function ExcludedModules({ option, readOnly }: { option: ProposalOption; readOnly?: boolean }) {
  const setModule = useSetOptionModule(option.notebookId)
  return (
    <div className="card p-4">
      <div className="field-label mb-2">No incluido en esta opción</div>
      <div className="flex flex-wrap gap-2">
        {option.excludedModules.map((m) => (
          <span key={m.id} className="flex items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-1.5 text-[13px] text-text-soft">
            <span className={clsx('chip', PRIORITY_CHIP[m.priority])}>{PRIORITY_LABEL[m.priority]}</span>
            {m.name}
            <span className="text-mono text-[12px] text-text-faint">{fmt(m.totalHours)} h</span>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-icon h-6 w-6"
                title="Agregar a esta opción"
                disabled={setModule.isPending}
                onClick={() => setModule.mutate({ optionId: option.id, moduleId: m.id, included: true, variant: 'FULL' })}
              >
                <Plus size={13} />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, unit, hint, dot }: { label: string; value: number | null; unit: string; hint: string; dot?: string }) {
  return (
    <div className="card p-5">
      <div className="field-label flex items-center gap-1.5">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />} {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-mono text-[28px] font-extrabold text-text">{fmt(value)}</span>
        <span className="text-[13px] text-text-soft">{unit}</span>
      </div>
      <div className="text-[12px] text-text-faint">{hint}</div>
    </div>
  )
}

function ListCard({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  if (!items.length) return null
  return (
    <div className="card p-5" style={accent ? { borderTop: '3px solid var(--accent)' } : undefined}>
      <h3 className="mb-2 text-[14px] font-extrabold text-text">{title}</h3>
      <ul className="flex flex-col gap-1.5 text-[13.5px] text-text-soft">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-2" /> {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
