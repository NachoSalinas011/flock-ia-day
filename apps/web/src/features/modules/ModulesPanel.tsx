import clsx from 'clsx'
import { Boxes, FileDown, GitCompare, Info, Loader2, Network, ScanSearch, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { EmptyState, Spinner } from '../../components/Feedback'
import { useProposalInsights } from '../../hooks/useProposals'
import type { SelectedProposal } from '../../hooks/useSelectedProposal'
import { diffProposals } from '../../lib/moduleDiff'
import { OptionTabs } from '../proposals/OptionTabs'
import { VersionChips } from '../proposals/VersionChips'
import { C4Diagram, type C4DiagramHandle } from './C4Diagram'
import { ghostKey, type Selection } from './c4Layout'
import { CoverageView } from './CoverageView'
import { ModuleDetail } from './ModuleDetail'
import { VersionDiffView } from './VersionDiffView'

type View = 'diagram' | 'coverage' | 'diff'

interface Props {
  notebookName: string
  selection: SelectedProposal
  onAskInChat: (question: string) => void
}

export function ModulesPanel({ notebookName, selection: selected, onAskInChat }: Props) {
  const { proposals, proposal, option, setSelectedId, tier, setTier } = selected
  const isLoading = !proposals
  const insights = useProposalInsights(proposal?.id ?? null)
  const [view, setView] = useState<View>('diagram')
  const [selection, setSelection] = useState<Selection>(null)
  const [showRisk, setShowRisk] = useState(true)
  const [showDependencies, setShowDependencies] = useState(false)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [onlyChanges, setOnlyChanges] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const diagramRef = useRef<C4DiagramHandle>(null)

  // any other option of any version can be the comparison base
  const others = (proposals ?? []).flatMap((p) => p.options).filter((o) => o.id !== option?.id)
  const base = others.find((o) => o.id === compareId) ?? null
  const diff = useMemo(() => {
    if (!base || !option || !proposals) return null
    const architectures = proposals.map((p) => p.architecture)
    return diffProposals(base, option, {
      base: `v${base.version} · ${base.label}`,
      target: `v${option.version} · ${option.label}`,
      containerName: (key) => architectures.flatMap((a) => a.containers).find((c) => c.key === key)?.name ?? key ?? '—',
      systemName: (key) => architectures.flatMap((a) => a.externalSystems).find((s) => s.key === key)?.name ?? key,
    })
  }, [base, option, proposals])
  const diffMode = useMemo(
    () =>
      diff
        ? {
            removed: diff.rows.filter((r) => r.status === 'removed'),
            onlyChanges,
          }
        : null,
    [diff, onlyChanges],
  )
  const scope = useMemo(
    () =>
      option && proposal && proposal.options.length > 1
        ? {
            label: option.label,
            variants: new Map(option.modules.map((m) => [m.id, m.variant])),
          }
        : null,
    [option, proposal],
  )
  const diffByModuleId = useMemo(() => (diff ? new Map(diff.rows.filter((r) => r.after).map((r) => [r.after!.id, r])) : null), [diff])

  if (isLoading)
    return (
      <div className="p-6">
        <Spinner label="Cargando…" />
      </div>
    )
  if (!proposal || !option) {
    return (
      <div className="p-6">
        <div className="card">
          <EmptyState icon={<Boxes size={22} />} title="Todavía no hay módulos identificados">
            Generá las propuestas: los módulos, su arquitectura y su trazabilidad aparecen acá.
          </EmptyState>
        </div>
      </div>
    )
  }

  const selectFromList = (s: Selection) => {
    setSelection(s)
    setView('diagram')
  }

  const selectedRow =
    diff && selection?.kind === 'module'
      ? selection.key.startsWith('ghost-')
        ? (diff.rows.find((r) => r.before && ghostKey(r.before.id) === selection.key) ?? null)
        : (diffByModuleId?.get(selection.key) ?? null)
      : null

  const exportPdf = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const image = await diagramRef.current?.capture()
      const { downloadProposalPdf } = await import('./pdf/downloadProposalPdf')
      await downloadProposalPdf({
        notebookName,
        proposal,
        option,
        diagram: image ?? null,
        comparisonLabel: diff && base ? `v${base.version} · ${base.label}` : null,
      })
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-6 py-3">
        <VersionChips
          proposals={proposals ?? []}
          selectedId={proposal.id}
          onSelect={(id) => {
            setSelection(null)
            setSelectedId(id)
          }}
        />
        <OptionTabs options={proposal.options} tier={tier} onSelect={setTier} />
        <div className="mx-2 flex overflow-hidden rounded-[9px] border border-border-strong">
          {(
            [
              ['diagram', 'Diagrama C4', <Network size={14} key="i" />],
              ['coverage', 'Cobertura y trazabilidad', <ScanSearch size={14} key="i" />],
              ['diff', 'Comparar', <GitCompare size={14} key="i" />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold"
              style={{
                background: view === key ? 'var(--brand)' : 'var(--panel)',
                color: view === key ? '#fff' : 'var(--text-soft)',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {others.length > 0 && (
          <label className="flex items-center gap-2 text-[12.5px] font-semibold text-text-soft">
            Comparar con
            <select className="input py-1" value={compareId ?? ''} onChange={(e) => setCompareId(e.target.value || null)}>
              <option value="">—</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  v{o.version} · {o.label}
                  {o.isFormal ? ' (elegida)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {view === 'diagram' ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            {diff && (
              <div className="border-b-2 bg-panel px-5 py-2.5 text-[13px] text-text" style={{ borderColor: 'var(--accent)' }}>
                {diff.summary.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            )}
            <div className="relative min-h-0 flex-1">
              <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
                {diff ? (
                  <>
                    <span
                      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white shadow-card"
                      style={{ background: 'var(--accent)' }}
                    >
                      <GitCompare size={13} /> Modo diferencias: v{option.version} · {option.label} vs v{base?.version} · {base?.label}
                      <button
                        type="button"
                        className="ml-1 cursor-pointer rounded-full hover:bg-white/20"
                        onClick={() => setCompareId(null)}
                        aria-label="Salir del modo diferencias"
                      >
                        <X size={13} />
                      </button>
                    </span>
                    <Toggle checked={onlyChanges} onChange={setOnlyChanges} label="Solo cambios" />
                  </>
                ) : (
                  <Toggle checked={showRisk} onChange={setShowRisk} label="Riesgo histórico" />
                )}
                <Toggle checked={showDependencies} onChange={setShowDependencies} label="Dependencias" />
                {proposal.architecture.inferred && (
                  <span
                    className="chip chip-pending flex items-center gap-1 shadow-card"
                    title="Esta versión no trae arquitectura: generá una nueva versión para obtenerla"
                  >
                    <Info size={11} /> Arquitectura inferida
                  </span>
                )}
              </div>
              <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost py-1.5 shadow-card"
                  disabled={exporting}
                  onClick={exportPdf}
                  title="Diagrama completo y tabla de contenedores"
                >
                  {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} {exporting ? 'Generando…' : 'PDF'}
                </button>
                {exportError && <span className="chip chip-blocked max-w-[260px] shadow-card">{exportError}</span>}
              </div>

              <C4Diagram
                ref={diagramRef}
                proposal={proposal}
                selection={selection}
                onSelect={setSelection}
                showRisk={showRisk}
                showDependencies={showDependencies}
                diffByModuleId={diffByModuleId}
                diffMode={diffMode}
                scope={scope}
              />
              {diff ? <DiffLegend /> : <Legend />}
            </div>
          </div>
          {selection && (
            <ModuleDetail
              proposal={proposal}
              selection={selection}
              insights={insights.data}
              insightsLoading={insights.isLoading}
              onSelect={setSelection}
              scopeModules={option.modules}
              comparison={
                diff
                  ? {
                      row: selectedRow,
                      baseLabel: `v${base?.version} · ${base?.label}`,
                      targetLabel: `v${option.version} · ${option.label}`,
                    }
                  : null
              }
            />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-6xl">
            {view === 'coverage' ? (
              <CoverageView
                proposal={proposal}
                insights={insights.data}
                isLoading={insights.isLoading}
                error={insights.error}
                onSelectModule={selectFromList}
                onAskInChat={onAskInChat}
              />
            ) : (
              <VersionDiffView base={base} target={option} diff={diff} onSelectModule={selectFromList} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold shadow-card',
        checked ? 'border-brand bg-brand-soft text-brand' : 'border-border-strong bg-panel text-text-soft',
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', checked ? 'bg-brand' : 'bg-border-strong')} /> {label}
    </button>
  )
}

function Legend() {
  const item = (color: string, label: string, dashed = false) => (
    <span className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded-sm"
        style={{
          background: dashed ? 'transparent' : color,
          border: dashed ? `1.5px dashed ${color}` : undefined,
        }}
      />
      {label}
    </span>
  )
  return (
    <div className="absolute bottom-3 left-14 z-10 flex flex-wrap gap-3 rounded-lg border border-border bg-panel px-3 py-1.5 text-[11px] text-text-soft shadow-card">
      {item('var(--state-done-fg)', 'Complejidad baja')}
      {item('var(--brand)', 'Media')}
      {item('var(--state-blocked-fg)', 'Alta')}
      {item('var(--text-faint)', 'Confianza baja', true)}
      {item('var(--accent)', 'Integración externa')}
    </div>
  )
}

function DiffLegend() {
  const item = (border: string, background: string, label: string, dashed = false) => (
    <span className="flex items-center gap-1.5">
      <span
        className="h-3 w-3 rounded-sm"
        style={{
          background,
          border: `2px ${dashed ? 'dashed' : 'solid'} ${border}`,
        }}
      />
      {label}
    </span>
  )
  return (
    <div className="absolute bottom-3 left-14 z-10 flex flex-wrap gap-3 rounded-lg border border-border bg-panel px-3 py-1.5 text-[11px] text-text-soft shadow-card">
      {item('var(--state-done-fg)', 'var(--state-done-bg)', 'Nuevo')}
      {item('var(--accent)', 'var(--panel)', 'Modificado')}
      {item('var(--state-blocked-fg)', 'var(--state-blocked-bg)', 'Eliminado', true)}
      {item('var(--border-strong)', 'var(--panel)', 'Sin cambios (atenuado)')}
    </div>
  )
}
