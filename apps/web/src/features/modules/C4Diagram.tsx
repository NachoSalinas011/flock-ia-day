import {
  Background,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import { forwardRef, useImperativeHandle, useMemo } from 'react'
import type { ModuleDiffRow } from '../../lib/moduleDiff'
import type { Proposal } from '../../lib/types'
import { buildC4Diagram, type DiagramOptions, type Selection } from './c4Layout'
import { c4NodeTypes } from './c4NodeTypes'

export interface DiagramImage {
  dataUrl: string
  width: number
  height: number
}

export interface C4DiagramHandle {
  /** high-resolution PNG of the whole diagram (not only the visible viewport) */
  capture: () => Promise<DiagramImage | null>
}

interface Props {
  proposal: Proposal
  selection: Selection
  onSelect: (selection: Selection) => void
  showRisk: boolean
  showDependencies: boolean
  diffByModuleId: Map<string, ModuleDiffRow> | null
  scope: DiagramOptions['scope']
  diffMode: DiagramOptions['diffMode']
}

export const C4Diagram = forwardRef<C4DiagramHandle, Props>(function C4Diagram(props, ref) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} ref={ref} />
    </ReactFlowProvider>
  )
})

const Canvas = forwardRef<C4DiagramHandle, Props>(function Canvas(
  { proposal, selection, onSelect, showRisk, showDependencies, diffByModuleId, scope, diffMode },
  ref,
) {
  const { getNodes, getInternalNode } = useReactFlow()

  /** Exact extent of the diagram: absolute position + measured size of every node (parents nest children). */
  const diagramBounds = () => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const node of getNodes()) {
      const internal = getInternalNode(node.id)
      if (!internal) continue
      const { x, y } = internal.internals.positionAbsolute
      const width = internal.measured.width ?? Number(node.style?.width ?? 0)
      const height = internal.measured.height ?? Number(node.style?.height ?? 0)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
  const { nodes, edges } = useMemo(
    () => buildC4Diagram(proposal, { selection, showRisk, showDependencies, diffByModuleId, scope, diffMode }),
    [proposal, selection, showRisk, showDependencies, diffByModuleId, scope, diffMode],
  )

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const viewport = document.querySelector<HTMLElement>('.c4-canvas .react-flow__viewport')
      if (!viewport) return null
      // the PDF is printed on white: capture with the light theme
      const root = document.documentElement
      const wasDark = root.classList.contains('dark')
      if (wasDark) {
        root.classList.remove('dark')
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }
      try {
      const bounds = diagramBounds()
      const margin = 40
      const width = Math.ceil(bounds.width + margin * 2)
      const height = Math.ceil(bounds.height + margin * 2)
      const x = margin - bounds.x
      const y = margin - bounds.y
      const zoom = 1
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#ffffff',
        width,
        height,
        pixelRatio: 2,
        style: { width: `${width}px`, height: `${height}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
      })
      return { dataUrl, width, height }
      } finally {
        if (wasDark) root.classList.add('dark')
      }
    },
  }))

  return (
    <div className="c4-canvas h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={c4NodeTypes}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          const [kind, ...rest] = node.id.split(':')
          if (!['module', 'external', 'container', 'actor'].includes(kind)) return onSelect(null)
          const key = rest.join(':')
          onSelect(selection?.kind === kind && selection.key === key ? null : { kind: kind as NonNullable<Selection>['kind'], key })
        }}
        onPaneClick={() => onSelect(null)}
      >
        <Background gap={20} size={1} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
})
