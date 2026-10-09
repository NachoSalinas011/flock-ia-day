import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useUpdateSettings, useUpdateTeam } from '../../hooks/useProposals'
import { fmt, ROLE_LABEL, SENIORITY_LABEL } from '../../lib/format'
import { DEV_ROLES, ROLES, SENIORITIES, type ProposalOption, type TeamMember } from '../../lib/types'

export function TeamEditor({ option: proposal, readOnly }: { option: ProposalOption; readOnly?: boolean }) {
  const updateTeam = useUpdateTeam(proposal.notebookId)
  const updateSettings = useUpdateSettings(proposal.notebookId)
  const scenario = proposal.estimation.team
  const team = proposal.team
  // one team PUT at a time: overlapping saves would overwrite each other
  const busy = updateTeam.isPending

  const save = (next: TeamMember[]) => updateTeam.mutate({ optionId: proposal.id, team: next })
  const change = (index: number, patch: Partial<TeamMember>) => save(team.map((m, i) => (i === index ? { ...m, ...patch } : m)))

  const saveSetting = (key: 'pmOverheadPct' | 'contingencyPct', value: number) => {
    if (Number.isNaN(value) || value === proposal[key] || value < 0 || value > 50) return
    updateSettings.mutate({ optionId: proposal.id, [key]: Math.round(value) })
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold text-text">Equipo{proposal.label && proposal.tier !== 'COMPLETE' ? ` · ${proposal.label}` : ''}</h3>
        {(updateTeam.isPending || updateSettings.isPending) && <span className="text-[12px] text-text-faint">Recalculando…</span>}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Seniority</th>
            <th className="num">Cant.</th>
            <th>Dedicación</th>
            {!readOnly && <th />}
          </tr>
        </thead>
        <tbody>
          {team.map((member, index) => (
            <tr key={member.id ?? index}>
              <td>
                {readOnly ? (
                  ROLE_LABEL[member.role]
                ) : (
                  <select
                    className="input py-1"
                    value={member.role}
                    disabled={busy}
                    onChange={(e) => change(index, { role: e.target.value as TeamMember['role'] })}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                {readOnly ? (
                  SENIORITY_LABEL[member.seniority]
                ) : (
                  <select
                    className="input py-1"
                    value={member.seniority}
                    disabled={busy}
                    onChange={(e) => change(index, { seniority: e.target.value as TeamMember['seniority'] })}
                  >
                    {SENIORITIES.map((s) => (
                      <option key={s} value={s}>
                        {SENIORITY_LABEL[s]}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td className="num">
                {readOnly ? (
                  member.count
                ) : (
                  <input
                    key={`count-${member.count}`}
                    type="number"
                    min={1}
                    max={10}
                    className="input input-cell text-mono"
                    defaultValue={member.count}
                    disabled={busy}
                    onBlur={(e) => {
                      const count = Number(e.target.value)
                      if (Number.isInteger(count) && count >= 1 && count <= 10) {
                        if (count !== member.count) change(index, { count })
                      } else e.target.value = String(member.count)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                )}
              </td>
              <td>
                {readOnly ? (
                  member.dedication === 'FT' ? 'Full time' : 'Part time'
                ) : (
                  <div className="inline-flex overflow-hidden rounded-lg border border-border-strong">
                    {(['FT', 'PT'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="cursor-pointer px-2.5 py-1 text-[12px] font-bold disabled:cursor-default disabled:opacity-60"
                        disabled={busy}
                        style={{
                          background: member.dedication === d ? 'var(--brand)' : 'var(--panel)',
                          color: member.dedication === d ? '#fff' : 'var(--text-soft)',
                        }}
                        onClick={() => member.dedication !== d && change(index, { dedication: d })}
                        title={d === 'FT' ? '8 h por día' : '4 h por día'}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </td>
              {!readOnly && (
                <td className="w-8">
                  <button
                    type="button"
                    className="btn btn-icon"
                    disabled={busy}
                    onClick={() => save(team.filter((_, i) => i !== index))}
                    aria-label="Quitar"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {!readOnly && (
        <button
          type="button"
          className="btn btn-small self-start"
          disabled={busy}
          onClick={() => save([...team, { role: 'BACKEND', seniority: 'SSR', count: 1, dedication: 'FT' }])}
        >
          <Plus size={14} /> Agregar perfil
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="field-label">Días por rol (con este equipo)</span>
        {DEV_ROLES.map((role) => {
          const days = scenario.daysByRole[role]
          const max = Math.max(...DEV_ROLES.map((r) => scenario.daysByRole[r] ?? 0), 1)
          const bottleneck = scenario.bottleneckRole === role
          return (
            <div key={role} className="flex items-center gap-2 text-[12.5px]">
              <span className="w-16 text-text-soft">{ROLE_LABEL[role]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${((days ?? 0) / max) * 100}%`, background: bottleneck ? 'var(--accent)' : 'var(--brand)' }}
                />
              </div>
              <span className="text-mono w-14 text-right font-bold text-text">{days === null ? 'sin asignar' : `${fmt(days)} d`}</span>
            </div>
          )
        })}
        {scenario.bottleneckRole && (
          <span className="text-[12px] text-text-faint">
            Cuello de botella: <b style={{ color: 'var(--accent)' }}>{ROLE_LABEL[scenario.bottleneckRole]}</b>
          </span>
        )}
      </div>

      {proposal.estimation.warnings.map((w) => (
        <div key={w} className="chip-blocked flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]">
          <AlertTriangle size={14} /> {w}
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
        {(
          [
            ['pmOverheadPct', 'Gestión PM %'],
            ['contingencyPct', 'Contingencia %'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="field">
            <span className="field-label">{label}</span>
            {readOnly ? (
              <span className="text-mono font-bold">{proposal[key]} %</span>
            ) : (
              <input
                key={`${key}-${proposal[key]}`}
                type="number"
                min={0}
                max={50}
                className="input text-mono"
                defaultValue={proposal[key]}
                onBlur={(e) => saveSetting(key, Number(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
