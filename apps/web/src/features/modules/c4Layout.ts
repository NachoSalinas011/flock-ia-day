import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { maxAnalogyDeviation, type ModuleDiffRow } from '../../lib/moduleDiff'
import type { Architecture, ContainerKind, Proposal, ProposalModule, ScopeVariant } from '../../lib/types'

export const MODULE_W = 210
export const MODULE_H = 92
const GAP = 14
const PAD = 14
const CONTAINER_HEAD = 54
const EMPTY_CONTAINER = { w: 230, h: 100 }
const SYSTEM_PAD = 30
const SYSTEM_HEAD = 46
const TIER_GAP = 70
const ROW_GAP = 46
const ACTOR = { w: 180, h: 96 }
const EXTERNAL = { w: 210, h: 86 }

export type Selection = { kind: 'module' | 'external' | 'container' | 'actor'; key: string } | null

export interface DiagramOptions {
  /** modules included in the option being viewed (null = show the whole catalog as included) */
  scope: { label: string; variants: Map<string, ScopeVariant> } | null
  showRisk: boolean
  showDependencies: boolean
  diffByModuleId: Map<string, ModuleDiffRow> | null
  /** comparison active: color by status, show removed modules as ghosts */
  diffMode: { removed: ModuleDiffRow[]; onlyChanges: boolean } | null
  selection: Selection
}

/** Selection key of a removed module drawn as a ghost (it has no row in this catalog). */
export const ghostKey = (moduleId: string) => `ghost-${moduleId}`

export interface ModuleNodeData extends Record<string, unknown> {
  module: ProposalModule
  maxHours: number
  risk: number | null
  showRisk: boolean
  diff: ModuleDiffRow | null
  dimmed: boolean
  selected: boolean
  /** null when the module is not part of the option being viewed */
  variant: ScopeVariant | null
  scopeLabel: string | null
  diffMode: boolean
  /** removed in the comparison: drawn dashed and crossed out */
  ghost: boolean
}

export interface BoxNodeData extends Record<string, unknown> {
  title: string
  subtitle?: string
  description?: string
  kind?: ContainerKind
  dimmed: boolean
  selected: boolean
  count?: number
}

const TIER: Record<ContainerKind, number> = { WEB: 0, MOBILE: 0, API: 1, WORKER: 1, DATABASE: 2 }

function containerSize(moduleCount: number) {
  if (moduleCount === 0) return { ...EMPTY_CONTAINER, cols: 0 }
  const cols = moduleCount <= 2 ? moduleCount : moduleCount <= 6 ? 2 : 3
  const rows = Math.ceil(moduleCount / cols)
  return {
    cols,
    w: PAD * 2 + cols * MODULE_W + (cols - 1) * GAP,
    h: CONTAINER_HEAD + rows * MODULE_H + (rows - 1) * GAP + PAD,
  }
}

/** Which nodes stay highlighted when something is selected. */
function connectedKeys(proposal: Proposal, selection: Selection): Set<string> | null {
  if (!selection) return null
  const keys = new Set<string>([`${selection.kind}:${selection.key}`])
  const modules = proposal.modules
  if (selection.kind === 'module') {
    const module = modules.find((m) => m.id === selection.key)
    if (!module) return null
    module.integrations.forEach((k) => keys.add(`external:${k}`))
    if (module.containerKey) keys.add(`container:${module.containerKey}`)
    modules
      .filter((m) => module.dependsOn.includes(m.name) || m.dependsOn.includes(module.name))
      .forEach((m) => keys.add(`module:${m.id}`))
  } else if (selection.kind === 'external') {
    modules
      .filter((m) => m.integrations.includes(selection.key))
      .forEach((m) => {
        keys.add(`module:${m.id}`)
        if (m.containerKey) keys.add(`container:${m.containerKey}`)
      })
  } else if (selection.kind === 'container') {
    modules.filter((m) => m.containerKey === selection.key).forEach((m) => keys.add(`module:${m.id}`))
  } else if (selection.kind === 'actor') {
    proposal.architecture.actors
      .find((a) => a.key === selection.key)
      ?.uses.forEach((k) => keys.add(`container:${k}`))
  }
  return keys
}

export function buildC4Diagram(proposal: Proposal, options: DiagramOptions): { nodes: Node[]; edges: Edge[] } {
  const arch: Architecture = proposal.architecture
  const nodes: Node[] = []
  const edges: Edge[] = []
  const highlight = connectedKeys(proposal, options.selection)
  const isDimmed = (key: string) => (highlight ? !highlight.has(key) : false)
  const isSelected = (key: string) =>
    options.selection ? `${options.selection.kind}:${options.selection.key}` === key : false
  const maxHours = Math.max(...proposal.modules.map((m) => m.totalHours), 1)

  // --- which modules are drawn: the whole catalog, or in diff mode the compared scope + ghosts
  type Placed = { module: ProposalModule; ghost: boolean; key: string }
  let placed: Placed[] = proposal.modules.map((m) => ({ module: m, ghost: false, key: m.id }))
  if (options.diffMode) {
    const inScope = (m: ProposalModule) => !options.scope || options.scope.variants.has(m.id)
    placed = proposal.modules
      .filter(inScope)
      .filter((m) => !options.diffMode!.onlyChanges || (options.diffByModuleId?.get(m.id)?.status ?? 'same') !== 'same')
      .map((m) => ({ module: m, ghost: false, key: m.id }))
    const containerKeys = new Set(arch.containers.map((c) => c.key))
    const fallback = arch.containers.find((c) => c.kind === 'API')?.key ?? arch.containers[0]?.key ?? null
    for (const row of options.diffMode.removed) {
      const before = row.before!
      placed.push({
        module: {
          ...before,
          containerKey: before.containerKey && containerKeys.has(before.containerKey) ? before.containerKey : fallback,
        },
        ghost: true,
        key: ghostKey(before.id),
      })
    }
  }

  // --- containers grouped in tiers inside the system boundary
  const sized = arch.containers.map((container) => {
    const modules = placed.filter((p) => p.module.containerKey === container.key)
    return { container, modules, ...containerSize(modules.length) }
  })
  const tiers = [0, 1, 2]
    .map((tier) => sized.filter((c) => TIER[c.container.kind] === tier))
    .filter((row) => row.length > 0)
  const rowWidth = (row: typeof sized) => row.reduce((acc, c) => acc + c.w, 0) + (row.length - 1) * ROW_GAP
  const innerWidth = Math.max(...tiers.map(rowWidth), 400)
  const systemWidth = innerWidth + SYSTEM_PAD * 2

  const actorsWidth = arch.actors.length * ACTOR.w + (arch.actors.length - 1) * 40
  const systemY = arch.actors.length ? ACTOR.h + 90 : 0

  let y = SYSTEM_HEAD
  const positions = new Map<string, { x: number; y: number; w: number; h: number }>()
  for (const row of tiers) {
    let x = SYSTEM_PAD + (innerWidth - rowWidth(row)) / 2
    const rowHeight = Math.max(...row.map((c) => c.h))
    for (const c of row) {
      positions.set(c.container.key, { x, y, w: c.w, h: c.h })
      x += c.w + ROW_GAP
    }
    y += rowHeight + TIER_GAP
  }
  const systemHeight = y - TIER_GAP + SYSTEM_PAD

  nodes.push({
    id: 'system',
    type: 'system',
    position: { x: 0, y: systemY },
    data: { title: 'Sistema propuesto', dimmed: false, selected: false } satisfies BoxNodeData,
    style: { width: systemWidth, height: systemHeight },
    selectable: false,
  })

  for (const { container, modules, cols, w, h } of sized) {
    const pos = positions.get(container.key)!
    const key = `container:${container.key}`
    nodes.push({
      id: key,
      type: container.kind === 'DATABASE' && modules.length === 0 ? 'database' : 'container',
      parentId: 'system',
      extent: 'parent',
      position: { x: pos.x, y: pos.y },
      style: { width: w, height: h },
      data: {
        title: container.name,
        subtitle: container.technology,
        description: container.description,
        kind: container.kind,
        count: modules.length,
        dimmed: isDimmed(key),
        selected: isSelected(key),
      } satisfies BoxNodeData,
    })
    modules.forEach(({ module, ghost, key: placedKey }, i) => {
      const moduleKey = `module:${placedKey}`
      nodes.push({
        id: moduleKey,
        type: 'module',
        parentId: key,
        extent: 'parent',
        position: {
          x: PAD + (i % cols) * (MODULE_W + GAP),
          y: CONTAINER_HEAD + Math.floor(i / cols) * (MODULE_H + GAP),
        },
        style: { width: MODULE_W, height: MODULE_H },
        data: {
          module,
          maxHours,
          // closed projects: the module's own actual deviation; proposals: their analogies'
          risk: ownDeviation(module) ?? maxAnalogyDeviation(module),
          showRisk: options.showRisk,
          diff: ghost
            ? (options.diffMode?.removed.find((r) => r.before?.id === module.id) ?? null)
            : (options.diffByModuleId?.get(module.id) ?? null),
          dimmed: isDimmed(moduleKey),
          selected: isSelected(moduleKey),
          variant: options.scope ? (options.scope.variants.get(module.id) ?? null) : 'FULL',
          scopeLabel: options.scope?.label ?? null,
          diffMode: Boolean(options.diffMode),
          ghost,
        } satisfies ModuleNodeData,
      })
    })
  }

  // --- actors above, centered over the system
  const actorsX = (systemWidth - actorsWidth) / 2
  arch.actors.forEach((actor, i) => {
    const key = `actor:${actor.key}`
    nodes.push({
      id: key,
      type: 'actor',
      position: { x: actorsX + i * (ACTOR.w + 40), y: 0 },
      style: { width: ACTOR.w, height: ACTOR.h },
      data: { title: actor.name, description: actor.description, dimmed: isDimmed(key), selected: isSelected(key) } satisfies BoxNodeData,
    })
    for (const target of actor.uses) {
      edges.push(edge(`${key}->${target}`, key, `container:${target}`, 'Usa', 'bottom', 'top', isDimmed(key)))
    }
  })

  // --- external systems on the right
  arch.externalSystems.forEach((system, i) => {
    const key = `external:${system.key}`
    const users = proposal.modules.filter((m) => m.integrations.includes(system.key))
    nodes.push({
      id: key,
      type: 'external',
      position: { x: systemWidth + 130, y: systemY + 40 + i * (EXTERNAL.h + 26) },
      style: { width: EXTERNAL.w, height: EXTERNAL.h },
      data: {
        title: system.name,
        description: system.description,
        count: users.length,
        dimmed: isDimmed(key),
        selected: isSelected(key),
      } satisfies BoxNodeData,
    })
    for (const module of users) {
      const from = `module:${module.id}`
      edges.push({
        ...edge(`${from}->${key}`, from, key, 'Integra', 'right', 'left', isDimmed(from) || isDimmed(key)),
        animated: !isDimmed(from),
        style: { stroke: 'var(--accent)', strokeWidth: 1.6, opacity: isDimmed(from) || isDimmed(key) ? 0.15 : 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#F85000' },
      })
    }
  })

  // --- container to container calls
  for (const container of arch.containers) {
    const from = `container:${container.key}`
    for (const target of container.calls) {
      const sameTier = TIER[container.kind] === TIER[arch.containers.find((c) => c.key === target)?.kind ?? 'API']
      edges.push(
        edge(`${from}->${target}`, from, `container:${target}`, 'Llama', sameTier ? 'right' : 'bottom', sameTier ? 'left' : 'top', isDimmed(from)),
      )
    }
  }

  // --- module dependencies: always when toggled, otherwise only around the selection
  for (const module of proposal.modules) {
    const from = `module:${module.id}`
    for (const dependency of module.dependsOn) {
      const target = proposal.modules.find((m) => m.name === dependency)
      if (!target) continue
      const to = `module:${target.id}`
      const involved = options.selection?.kind === 'module' && [module.id, target.id].includes(options.selection.key)
      if (!options.showDependencies && !involved) continue
      edges.push({
        id: `${from}=>${to}`,
        source: from,
        target: to,
        sourceHandle: 'top',
        targetHandle: 'bottom',
        type: 'default',
        label: 'depende de',
        zIndex: 10,
        style: { stroke: 'var(--brand-2)', strokeDasharray: '5 4', strokeWidth: 1.4 },
        labelStyle: { fill: 'var(--text-soft)', fontSize: 10 },
        labelBgStyle: { fill: 'var(--panel)' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#9D2BD6' },
      })
    }
  }

  const ids = new Set(nodes.map((n) => n.id))
  return { nodes, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) }
}

function ownDeviation(module: ProposalModule): number | null {
  if (module.actualTotalHours === null || module.totalHours === 0) return null
  return Math.round(((module.actualTotalHours - module.totalHours) / module.totalHours) * 1000) / 10
}

function edge(
  id: string,
  source: string,
  target: string,
  label: string,
  sourceHandle: string,
  targetHandle: string,
  dimmed: boolean,
): Edge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    label,
    type: 'smoothstep',
    style: { stroke: 'var(--text-faint)', strokeWidth: 1.3, opacity: dimmed ? 0.15 : 1 },
    labelStyle: { fill: 'var(--text-soft)', fontSize: 10.5, fontWeight: 600 },
    labelBgStyle: { fill: 'var(--panel)' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#9b8aa8' },
  }
}
