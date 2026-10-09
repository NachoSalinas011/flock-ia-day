import clsx from 'clsx'
import { ArrowRight, GitCompare } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../../components/Feedback'
import { fmt, ROLE_SHORT } from '../../lib/format'
import type { DiffStatus, ProposalDiff } from '../../lib/moduleDiff'
import { DEV_ROLES, type ProposalOption } from '../../lib/types'
import type { Selection } from './c4Layout'

const STATUS: Record<DiffStatus, { label: string; chip: string }> = {
  added: { label: 'Nuevo', chip: 'chip-done' },
  removed: { label: 'Eliminado', chip: 'chip-blocked' },
  changed: { label: 'Modificado', chip: 'chip-progress' },
  same: { label: 'Sin cambios', chip: 'chip-pending' },
}
const ORDER: DiffStatus[] = ['added', 'removed', 'changed', 'same']

interface Props {
  base: ProposalOption | null
  target: ProposalOption
  diff: ProposalDiff | null
  onSelectModule: (selection: Selection) => void
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${fmt(n)}`

export function VersionDiffView({ base, target, diff, onSelectModule }: Props) {
  const [showSame, setShowSame] = useState(false)
  if (!base || !diff) {
    return (
      <div className="card">
        <EmptyState icon={<GitCompare size={22} />} title="Elegí con qué comparar">
          Usá el selector "Comparar con" de arriba: podés comparar esta opción con otra opción (por ejemplo MVP vs. Completa) o con otra versión.
        </EmptyState>
      </div>
    )
  }

  const rows = [...diff.rows].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || Math.abs(b.deltaHours) - Math.abs(a.deltaHours))

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-text">
          v{base.version} · {base.label} <ArrowRight size={16} className="text-text-faint" /> v{target.version} · {target.label}
          <span className="ml-2 flex gap-1.5">
            {ORDER.filter((s) => s !== 'same' && diff.counts[s]).map((s) => (
              <span key={s} className={clsx('chip', STATUS[s].chip)}>
                {diff.counts[s]} {STATUS[s].label.toLowerCase()}
              </span>
            ))}
          </span>
        </div>
        <div className="mb-3 rounded-lg border-l-4 bg-surface px-4 py-2.5 text-[13.5px] text-text" style={{ borderColor: 'var(--accent)' }}>
          {diff.summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {diff.totals.map((t) => {
            const delta = t.before !== null && t.after !== null ? t.after - t.before : null
            return (
              <div key={t.label} className="rounded-lg bg-surface px-3 py-2">
                <div className="field-label">{t.label}</div>
                <div className="text-mono flex items-baseline gap-1.5 text-[17px] font-extrabold text-text">
                  {fmt(t.after)}
                  {delta !== null && delta !== 0 && (
                    <span className="text-[12px]" style={{ color: delta > 0 ? 'var(--state-blocked-fg)' : 'var(--state-done-fg)' }}>
                      {signed(delta)}
                    </span>
                  )}
                </div>
                <div className="text-mono text-[11px] text-text-faint">antes {fmt(t.before)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-[12.5px] text-text-soft">
            {diff.counts.same} módulo{diff.counts.same === 1 ? '' : 's'} sin cambios
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-text-soft">
            <input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} /> Mostrar sin cambios
          </label>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cambio</th>
              <th>Módulo</th>
              <th className="num">Antes h</th>
              <th className="num">Después h</th>
              <th className="num">Δ h</th>
              {DEV_ROLES.map((r) => (
                <th key={r} className="num">
                  Δ {ROLE_SHORT[r]}
                </th>
              ))}
              <th className="min-w-[260px]">Qué cambió</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter((row) => showSame || row.status !== 'same').map((row) => (
              <tr key={`${row.status}-${row.name}`} className={clsx(row.status === 'removed' && 'opacity-70')}>
                <td>
                  <span className={clsx('chip', STATUS[row.status].chip)}>{STATUS[row.status].label}</span>
                </td>
                <td>
                  {row.after ? (
                    <button type="button" className="cursor-pointer text-left font-semibold text-text hover:text-brand" onClick={() => onSelectModule({ kind: 'module', key: row.after!.id })}>
                      {row.name}
                    </button>
                  ) : (
                    <span className="font-semibold text-text line-through">{row.name}</span>
                  )}
                  {row.before && row.after && row.before.name !== row.after.name && (
                    <div className="text-[11.5px] text-text-faint">antes: {row.before.name}</div>
                  )}
                </td>
                <td className="num">{fmt(row.before?.totalHours ?? null)}</td>
                <td className="num">{fmt(row.after?.totalHours ?? null)}</td>
                <td className="num font-bold" style={{ color: row.deltaHours > 0 ? 'var(--state-blocked-fg)' : row.deltaHours < 0 ? 'var(--state-done-fg)' : undefined }}>
                  {row.deltaHours ? signed(row.deltaHours) : '—'}
                </td>
                {DEV_ROLES.map((r) => {
                  const delta = row.deltaByRole[r]
                  return (
                    <td
                      key={r}
                      className="num font-semibold"
                      style={
                        delta
                          ? {
                              background: delta > 0 ? 'var(--state-blocked-bg)' : 'var(--state-done-bg)',
                              color: delta > 0 ? 'var(--state-blocked-fg)' : 'var(--state-done-fg)',
                            }
                          : undefined
                      }
                    >
                      {delta ? signed(delta) : ''}
                    </td>
                  )
                })}
                <td className="text-[12.5px]">
                  <ul className="flex flex-col gap-0.5">
                    {row.sentences.map((sentence) => (
                      <li key={sentence} className="font-semibold text-text">
                        · {sentence}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
