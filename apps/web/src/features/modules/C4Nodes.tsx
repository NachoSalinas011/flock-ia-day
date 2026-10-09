import { Handle, Position, type NodeProps } from '@xyflow/react'
import clsx from 'clsx'
import { Cloud, Database, Globe, Plug, Server, Smartphone, TriangleAlert, User, Workflow } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { fmt } from '../../lib/format'
import type { ContainerKind } from '../../lib/types'
import type { BoxNodeData, ModuleNodeData } from './c4Layout'

const RISK_THRESHOLD = 20

/** Loose connection mode: each side has one handle used both as source and target. */
function Handles() {
  const style: CSSProperties = { opacity: 0, width: 6, height: 6, border: 'none' }
  return (
    <>
      <Handle id="top" type="source" position={Position.Top} style={style} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={style} />
      <Handle id="left" type="source" position={Position.Left} style={style} />
      <Handle id="right" type="source" position={Position.Right} style={style} />
    </>
  )
}

const dimStyle = (dimmed: boolean): CSSProperties => ({ opacity: dimmed ? 0.3 : 1, transition: 'opacity .15s' })

const KIND_ICON: Record<ContainerKind, ReactNode> = {
  WEB: <Globe size={14} />,
  MOBILE: <Smartphone size={14} />,
  API: <Server size={14} />,
  WORKER: <Workflow size={14} />,
  DATABASE: <Database size={14} />,
}

export function SystemNode({ data }: NodeProps) {
  const d = data as BoxNodeData
  return (
    <div className="h-full w-full rounded-2xl border-2 border-dashed border-border-strong" style={{ background: 'transparent' }}>
      <div className="px-4 pt-3 text-[11px] font-bold tracking-wide text-text-faint uppercase">{d.title} · límite del sistema</div>
    </div>
  )
}

export function ContainerNode({ data }: NodeProps) {
  const d = data as BoxNodeData
  return (
    <div
      className={clsx('h-full w-full cursor-pointer rounded-xl border-2 bg-surface', d.selected ? 'border-brand' : 'border-border-strong')}
      style={dimStyle(d.dimmed)}
    >
      <Handles />
      <div className="flex items-start gap-2 px-3.5 pt-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {d.kind && KIND_ICON[d.kind]}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-extrabold text-text">{d.title}</div>
          <div className="truncate text-[11px] text-text-faint">
            [Contenedor: {d.subtitle}]{d.count ? ` · ${d.count} módulos` : ''}
          </div>
        </div>
      </div>
      {!d.count && d.description && <div className="px-3.5 pt-1 text-[11.5px] text-text-soft">{d.description}</div>}
    </div>
  )
}

export function DatabaseNode({ data }: NodeProps) {
  const d = data as BoxNodeData
  return (
    <div
      className={clsx('flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-[50%/18%] border-2 bg-surface px-3 text-center', d.selected ? 'border-brand' : 'border-border-strong')}
      style={dimStyle(d.dimmed)}
    >
      <Handles />
      <Database size={16} className="text-brand" />
      <div className="text-[13px] font-extrabold text-text">{d.title}</div>
      <div className="text-[11px] text-text-faint">[{d.subtitle}]</div>
    </div>
  )
}

export function ActorNode({ data }: NodeProps) {
  const d = data as BoxNodeData
  return (
    <div
      className={clsx('flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-3 text-center text-white', d.selected && 'ring-2 ring-accent')}
      style={{ background: 'var(--brand-dark)', ...dimStyle(d.dimmed) }}
    >
      <Handles />
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
        <User size={15} />
      </span>
      <div className="text-[13px] font-extrabold">{d.title}</div>
      <div className="line-clamp-2 text-[10.5px] text-white/70">{d.description}</div>
    </div>
  )
}

export function ExternalNode({ data }: NodeProps) {
  const d = data as BoxNodeData
  return (
    <div
      className={clsx('flex h-full w-full cursor-pointer flex-col justify-center gap-0.5 rounded-xl border-2 border-dashed px-3', d.selected ? 'border-accent' : 'border-border-strong')}
      style={{ background: 'var(--state-pending-bg)', ...dimStyle(d.dimmed) }}
    >
      <Handles />
      <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-text">
        <Cloud size={14} className="shrink-0 text-text-soft" /> <span className="truncate">{d.title}</span>
      </div>
      <div className="text-[10.5px] font-semibold text-text-faint">[Sistema externo]{d.count ? ` · ${d.count} módulos` : ''}</div>
      <div className="line-clamp-2 text-[11px] text-text-soft">{d.description}</div>
    </div>
  )
}

const COMPLEXITY_COLOR = {
  LOW: 'var(--state-done-fg)',
  MEDIUM: 'var(--brand)',
  HIGH: 'var(--state-blocked-fg)',
} as const

export function ModuleNode({ data }: NodeProps) {
  const nodeData = data as ModuleNodeData
  if (nodeData.diffMode) return <DiffModuleNode data={nodeData} />
  const { module, maxHours, risk, showRisk, diff, dimmed, selected, variant, scopeLabel } = nodeData
  const excluded = variant === null
  const risky = showRisk && risk !== null && risk > RISK_THRESHOLD
  const lowConfidence = module.confidence === 'LOW'

  return (
    <div
      className={clsx(
        'relative flex h-full w-full cursor-pointer flex-col rounded-[10px] border bg-panel pl-3 pr-2.5 py-2 shadow-card transition-shadow hover:shadow-pop',
        (lowConfidence || excluded) && 'border-dashed',
        selected ? 'border-brand ring-2 ring-brand/30' : 'border-border-strong',
        excluded && 'bg-surface',
      )}
      style={{
        ...dimStyle(dimmed),
        ...(excluded && !dimmed && { opacity: 0.45 }),
        ...(risky && { boxShadow: '0 0 0 2px var(--state-blocked-fg)' }),
      }}
    >
      <Handles />
      <span className="absolute inset-y-0 left-0 w-1 rounded-l-[10px]" style={{ background: COMPLEXITY_COLOR[module.complexity] }} />
      <div className="flex items-start justify-between gap-1.5">
        <div className="line-clamp-2 text-[12.5px] leading-tight font-bold text-text">{module.name}</div>
        <div className="flex shrink-0 gap-1">
          {module.integrations.length > 0 && (
            <span title="Integra con sistemas externos" className="text-accent">
              <Plug size={13} />
            </span>
          )}
          {risky && (
            <span title={module.actualTotalHours !== null ? `Se desvió ${risk} % en la realidad` : `Su analogía histórica se desvió ${risk} %`} style={{ color: 'var(--state-blocked-fg)' }}>
              <TriangleAlert size={13} />
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-mono text-[12px] font-extrabold text-text">{fmt(module.totalHours)} h</span>
        <span className="text-mono text-[10px] text-text-faint">
          FE {module.estimatedHours.FRONTEND} · BE {module.estimatedHours.BACKEND}
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface" title="Horas relativas al módulo más grande">
        <div className="h-full rounded-full bg-brand-2" style={{ width: `${(module.totalHours / maxHours) * 100}%` }} />
      </div>
      {(diff && diff.status !== 'same') || risky || excluded || variant === 'REDUCED' ? (
        <div className="absolute -top-2.5 right-2 flex gap-1">
          {excluded && <span className="chip chip-pending py-0.5 shadow-card">Fuera de {scopeLabel}</span>}
          {variant === 'REDUCED' && (
            <span className="chip py-0.5 shadow-card" style={{ background: 'var(--state-pending-bg)', color: 'var(--accent)' }}>
              Reducido
            </span>
          )}
          {diff?.status === 'added' && <span className="chip chip-done py-0.5 shadow-card">Nuevo</span>}
          {diff?.status === 'changed' && diff.deltaHours !== 0 && (
            <span className={clsx('chip py-0.5 shadow-card', diff.deltaHours > 0 ? 'chip-blocked' : 'chip-done')}>
              {diff.deltaHours > 0 ? '+' : ''}
              {diff.deltaHours} h
            </span>
          )}
          {risky && <span className="chip chip-blocked py-0.5 shadow-card">+{Math.round(risk)} % {module.actualTotalHours !== null ? 'real' : 'hist.'}</span>}
        </div>
      ) : null}
    </div>
  )
}

const DIFF_STYLE = {
  added: { label: 'NUEVO', border: 'var(--state-done-fg)', background: 'var(--state-done-bg)', chip: 'chip-done' },
  removed: { label: 'ELIMINADO', border: 'var(--state-blocked-fg)', background: 'var(--state-blocked-bg)', chip: 'chip-blocked' },
  changed: { label: 'MODIFICADO', border: 'var(--accent)', background: 'var(--panel)', chip: 'chip-blocked' },
  same: { label: '', border: 'var(--border-strong)', background: 'var(--panel)', chip: 'chip-pending' },
} as const

/** Comparison rendering: what changed is loud, what didn't fades out. */
function DiffModuleNode({ data }: { data: ModuleNodeData }) {
  const { module, diff, ghost, selected, dimmed } = data
  const status = ghost ? 'removed' : (diff?.status ?? 'same')
  const style = DIFF_STYLE[status]
  const changes = diff?.changes ?? []

  return (
    <div
      className={clsx(
        'relative flex h-full w-full cursor-pointer flex-col rounded-[10px] px-2.5 py-2 transition-shadow',
        status !== 'same' && 'shadow-card hover:shadow-pop',
        selected && 'ring-2 ring-brand/40',
      )}
      style={{
        border: `${status === 'same' ? 1 : 2}px ${status === 'removed' ? 'dashed' : 'solid'} ${style.border}`,
        background: style.background,
        opacity: status === 'same' ? (dimmed ? 0.15 : 0.3) : dimmed ? 0.35 : 1,
        transition: 'opacity .15s',
      }}
    >
      <Handles />
      <div className={clsx('line-clamp-2 text-[12.5px] leading-tight font-bold text-text', status === 'removed' && 'line-through')}>
        {module.name}
      </div>
      {status === 'changed' ? (
        <div className="mt-auto flex flex-col gap-0.5">
          {changes.slice(0, 2).map((c) => (
            <div key={c.field} className="text-mono truncate text-[10.5px] font-bold" title={`${c.label}: ${c.before} → ${c.after}`}>
              <span className="text-text-faint">{c.label}:</span>{' '}
              <span className="text-text-soft line-through decoration-1">{c.before}</span>{' '}
              <span style={{ color: c.tone === 'up' ? 'var(--state-blocked-fg)' : c.tone === 'down' ? 'var(--state-done-fg)' : 'var(--accent)' }}>
                → {c.after}
              </span>
            </div>
          ))}
          {changes.length > 2 && <div className="text-[10px] text-text-faint">+{changes.length - 2} cambios más</div>}
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className={clsx('text-mono text-[12px] font-extrabold text-text', status === 'removed' && 'line-through')}>
            {fmt(module.totalHours)} h
          </span>
          {module.variant === 'REDUCED' && <span className="text-[10px] font-bold text-accent">Reducido</span>}
        </div>
      )}
      {status !== 'same' && (
        <div className="absolute -top-2.5 right-2 flex gap-1">
          <span className={clsx('chip py-0.5 shadow-card', style.chip)} style={status === 'changed' ? { background: 'var(--accent)', color: '#fff' } : undefined}>
            {style.label}
          </span>
          {diff && diff.deltaHours !== 0 && (
            <span className={clsx('chip py-0.5 shadow-card', diff.deltaHours > 0 ? 'chip-blocked' : 'chip-done')}>
              {diff.deltaHours > 0 ? '+' : '−'}
              {fmt(Math.abs(diff.deltaHours))} h
            </span>
          )}
        </div>
      )}
    </div>
  )
}
