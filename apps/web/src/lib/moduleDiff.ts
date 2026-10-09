import { DEV_ROLES, type Estimation, type Level, type Priority, type ProposalModule, type RoleHours } from './types'

/** Anything with a module list and its numbers: a scope option of any version. */
export interface ComparableScope {
  modules: ProposalModule[]
  estimation: Estimation
}

export type DiffStatus = 'added' | 'removed' | 'changed' | 'same'

export type ChangeTone = 'up' | 'down' | 'neutral'

/** One field that differs between the two versions of a module. */
export interface FieldChange {
  field: 'name' | 'variant' | 'priority' | 'complexity' | 'container' | 'integrations' | 'dependsOn' | 'hours'
  label: string
  before: string
  after: string
  tone: ChangeTone
}

export interface ModuleDiffRow {
  status: DiffStatus
  name: string
  before: ProposalModule | null
  after: ProposalModule | null
  deltaHours: number
  deltaByRole: RoleHours
  complexityChange: { from: Level; to: Level } | null
  changes: FieldChange[]
  /** short human sentences: "Pasa a versión reducida: solo email", "BE −62 h" */
  sentences: string[]
}

export interface ProposalDiff {
  rows: ModuleDiffRow[]
  totals: { label: string; before: number | null; after: number | null }[]
  counts: Record<DiffStatus, number>
  /** natural-language overview of the whole comparison */
  summary: string[]
}

export interface DiffLabels {
  base: string
  target: string
  containerName?: (key: string | null) => string
  systemName?: (key: string) => string
}

const LEVEL: Record<Level, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' }
const PRIORITY: Record<Priority, string> = { MUST: 'Indispensable', SHOULD: 'Importante', COULD: 'Deseable' }
const ROLE: Record<keyof RoleHours, string> = { UX: 'UX', FRONTEND: 'FE', BACKEND: 'BE', QA: 'QA' }

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt.format(Math.abs(n))}`

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const STOPWORDS = new Set(['de', 'y', 'la', 'el', 'los', 'las', 'del', 'por', 'para', 'con', 'en', 'e'])
const tokens = (s: string) => new Set(normalize(s).split(' ').filter((t) => t.length > 2 && !STOPWORDS.has(t)))

/** Name similarity tolerant to the model rewording a module between versions. */
function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const ta = tokens(a)
  const tb = tokens(b)
  const shared = [...ta].filter((t) => tb.has(t)).length
  return (shared / Math.max(1, Math.min(ta.size, tb.size))) * 0.8
}

const MATCH_THRESHOLD = 0.5

/** Two modules calibrated with the same historical module are the same scope, even if renamed. */
function sharesAnalogy(a: ProposalModule, b: ProposalModule): boolean {
  const keys = new Set(a.analogies.map((x) => `${x.project}|${x.module}`))
  return b.analogies.some((x) => keys.has(`${x.project}|${x.module}`))
}

export function diffProposals(base: ComparableScope, target: ComparableScope, labels?: DiffLabels): ProposalDiff {
  const unmatched = new Set(base.modules.map((m) => m.id))
  const rows: ModuleDiffRow[] = []
  const names = {
    container: labels?.containerName ?? ((key: string | null) => key ?? '—'),
    system: labels?.systemName ?? ((key: string) => key),
  }

  for (const after of target.modules) {
    let best: ProposalModule | null = null
    let bestScore = 0
    for (const before of base.modules) {
      if (!unmatched.has(before.id)) continue
      // same version: options share the catalog, so the id is an exact match
      const score =
        before.id === after.id ? 2 : Math.max(similarity(before.name, after.name), sharesAnalogy(before, after) ? 0.75 : 0)
      if (score > bestScore) {
        bestScore = score
        best = before
      }
    }
    if (best && bestScore >= MATCH_THRESHOLD) {
      unmatched.delete(best.id)
      rows.push(compare(best, after, names))
    } else {
      rows.push(compare(null, after, names))
    }
  }
  for (const before of base.modules.filter((m) => unmatched.has(m.id))) {
    rows.push(compare(before, null, names))
  }

  const counts = { added: 0, removed: 0, changed: 0, same: 0 }
  rows.forEach((r) => counts[r.status]++)

  const e1 = base.estimation
  const e2 = target.estimation
  return {
    rows,
    counts,
    summary: summarize(rows, base, target, labels),
    totals: [
      { label: 'Módulos', before: base.modules.length, after: target.modules.length },
      { label: 'Horas de desarrollo', before: e1.devHours, after: e2.devHours },
      { label: 'Esfuerzo total (h)', before: e1.totalHours, after: e2.totalHours },
      { label: 'Duración con el equipo (días)', before: e1.team.durationDays, after: e2.team.durationDays },
      { label: 'Duración todo FT (días)', before: e1.allFullTime.durationDays, after: e2.allFullTime.durationDays },
      { label: 'Duración todo PT (días)', before: e1.allPartTime.durationDays, after: e2.allPartTime.durationDays },
    ],
  }
}

function compare(
  before: ProposalModule | null,
  after: ProposalModule | null,
  names: { container: (key: string | null) => string; system: (key: string) => string },
): ModuleDiffRow {
  const deltaByRole = { UX: 0, FRONTEND: 0, BACKEND: 0, QA: 0 }
  for (const role of DEV_ROLES) {
    deltaByRole[role] = (after?.estimatedHours[role] ?? 0) - (before?.estimatedHours[role] ?? 0)
  }
  const deltaHours = (after?.totalHours ?? 0) - (before?.totalHours ?? 0)
  const complexityChange =
    before && after && before.complexity !== after.complexity ? { from: before.complexity, to: after.complexity } : null
  const name = (after ?? before)!.name

  if (!before || !after) {
    const module = (after ?? before)!
    const reduced = module.variant === 'REDUCED'
    return {
      status: before ? 'removed' : 'added',
      name,
      before,
      after,
      deltaHours,
      deltaByRole,
      complexityChange,
      changes: [],
      sentences: [
        before
          ? `Se quita (${signed(deltaHours)} h)`
          : `Se agrega${reduced ? ' en versión reducida' : ''} (${signed(deltaHours)} h)`,
      ],
    }
  }

  const changes: FieldChange[] = []
  const sentences: string[] = []

  if (before.name !== after.name) {
    changes.push({ field: 'name', label: 'Nombre', before: before.name, after: after.name, tone: 'neutral' })
    sentences.push(`Renombrado (antes «${before.name}»)`)
  }
  if (before.variant !== after.variant) {
    const toReduced = after.variant === 'REDUCED'
    changes.push({
      field: 'variant',
      label: 'Alcance',
      before: before.variant === 'REDUCED' ? 'Reducido' : 'Completo',
      after: toReduced ? 'Reducido' : 'Completo',
      tone: toReduced ? 'down' : 'up',
    })
    sentences.push(
      toReduced
        ? `Pasa a versión reducida${after.reducedDescription ? `: ${after.reducedDescription}` : ''}`
        : 'Pasa a versión completa',
    )
  }
  if (deltaHours !== 0 || DEV_ROLES.some((r) => deltaByRole[r] !== 0)) {
    const byRole = DEV_ROLES.filter((r) => deltaByRole[r] !== 0)
      .map((r) => `${ROLE[r]} ${signed(deltaByRole[r])}`)
      .join(', ')
    changes.push({
      field: 'hours',
      label: 'Horas',
      before: `${fmt.format(before.totalHours)} h`,
      after: `${fmt.format(after.totalHours)} h`,
      tone: deltaHours > 0 ? 'up' : deltaHours < 0 ? 'down' : 'neutral',
    })
    sentences.push(`${signed(deltaHours)} h${byRole ? ` (${byRole})` : ''}`)
  }
  if (before.priority !== after.priority) {
    changes.push({ field: 'priority', label: 'Prioridad', before: PRIORITY[before.priority], after: PRIORITY[after.priority], tone: 'neutral' })
    sentences.push(`Prioridad: ${PRIORITY[before.priority]} → ${PRIORITY[after.priority]}`)
  }
  if (complexityChange) {
    const up = ['LOW', 'MEDIUM', 'HIGH'].indexOf(complexityChange.to) > ['LOW', 'MEDIUM', 'HIGH'].indexOf(complexityChange.from)
    changes.push({ field: 'complexity', label: 'Complejidad', before: LEVEL[complexityChange.from], after: LEVEL[complexityChange.to], tone: up ? 'up' : 'down' })
    sentences.push(`Complejidad: ${LEVEL[complexityChange.from]} → ${LEVEL[complexityChange.to]}`)
  }
  if (before.containerKey !== after.containerKey) {
    changes.push({
      field: 'container',
      label: 'Contenedor',
      before: names.container(before.containerKey),
      after: names.container(after.containerKey),
      tone: 'neutral',
    })
    sentences.push(`Se mueve de ${names.container(before.containerKey)} a ${names.container(after.containerKey)}`)
  }
  const addedSystems = after.integrations.filter((k) => !before.integrations.includes(k))
  const removedSystems = before.integrations.filter((k) => !after.integrations.includes(k))
  if (addedSystems.length || removedSystems.length) {
    changes.push({
      field: 'integrations',
      label: 'Integraciones',
      before: before.integrations.map(names.system).join(', ') || '—',
      after: after.integrations.map(names.system).join(', ') || '—',
      tone: addedSystems.length ? 'up' : 'down',
    })
    if (addedSystems.length) sentences.push(`Suma integración con ${addedSystems.map(names.system).join(', ')}`)
    if (removedSystems.length) sentences.push(`Quita integración con ${removedSystems.map(names.system).join(', ')}`)
  }
  const addedDeps = after.dependsOn.filter((d) => !before.dependsOn.includes(d))
  const removedDeps = before.dependsOn.filter((d) => !after.dependsOn.includes(d))
  if (addedDeps.length || removedDeps.length) {
    changes.push({
      field: 'dependsOn',
      label: 'Depende de',
      before: before.dependsOn.join(', ') || '—',
      after: after.dependsOn.join(', ') || '—',
      tone: 'neutral',
    })
    if (addedDeps.length) sentences.push(`Nueva dependencia: ${addedDeps.join(', ')}`)
    if (removedDeps.length) sentences.push(`Ya no depende de ${removedDeps.join(', ')}`)
  }

  return {
    status: changes.length ? 'changed' : 'same',
    name,
    before,
    after,
    deltaHours,
    deltaByRole,
    complexityChange,
    changes,
    sentences,
  }
}

function summarize(rows: ModuleDiffRow[], base: ComparableScope, target: ComparableScope, labels?: DiffLabels): string[] {
  const sum = (items: ModuleDiffRow[]) => items.reduce((acc, r) => acc + r.deltaHours, 0)
  const added = rows.filter((r) => r.status === 'added')
  const removed = rows.filter((r) => r.status === 'removed')
  const changed = rows.filter((r) => r.status === 'changed')
  const toFull = changed.filter((r) => r.changes.some((c) => c.field === 'variant' && c.after === 'Completo'))
  const toReduced = changed.filter((r) => r.changes.some((c) => c.field === 'variant' && c.after === 'Reducido'))
  const subject = labels ? `${labels.target} frente a ${labels.base}` : 'Esta opción'

  const parts: string[] = []
  if (added.length) parts.push(`agrega ${added.length} módulo${added.length > 1 ? 's' : ''} (${signed(sum(added))} h)`)
  if (removed.length) parts.push(`quita ${removed.length} (${signed(sum(removed))} h)`)
  if (toFull.length) parts.push(`pasa ${toFull.length} de reducido a completo (${signed(sum(toFull))} h)`)
  if (toReduced.length) parts.push(`reduce ${toReduced.length} (${signed(sum(toReduced))} h)`)
  const otherChanged = changed.filter((r) => !toFull.includes(r) && !toReduced.includes(r))
  if (otherChanged.length) parts.push(`modifica ${otherChanged.length} más`)

  const lines = [parts.length ? `${subject}: ${parts.join(', ')}.` : `${subject}: el alcance de los módulos es el mismo.`]

  const e1 = base.estimation
  const e2 = target.estimation
  const days = (n: number | null) => (n === null ? '—' : `${n} días`)
  const deltaDays =
    e1.team.durationDays !== null && e2.team.durationDays !== null ? e2.team.durationDays - e1.team.durationDays : null
  lines.push(
    `Esfuerzo total: ${fmt.format(e1.totalHours)} → ${fmt.format(e2.totalHours)} h (${signed(e2.totalHours - e1.totalHours)} h). ` +
      `Duración con su equipo: ${days(e1.team.durationDays)} → ${days(e2.team.durationDays)}` +
      (deltaDays === null ? '.' : deltaDays === 0 ? ' (mismo plazo).' : ` (${signed(deltaDays)} ${Math.abs(deltaDays) === 1 ? 'día' : 'días'}).`),
  )
  return lines
}

/** Highest historical deviation among a module's analogies (for the risk overlay). */
export function maxAnalogyDeviation(module: ProposalModule): number | null {
  const values = module.analogies.map((a) => a.deviationPct).filter((v): v is number => v !== null)
  return values.length ? Math.max(...values) : null
}
