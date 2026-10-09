import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Proposal, ProposalOption } from '../../../lib/types'
import type { DiagramImage } from '../C4Diagram'

// Flock Design System tokens (PDF can't read CSS variables)
const C = {
  brandDark: '#300840',
  text: '#2c0b3a',
  soft: '#6b5a78',
  faint: '#9b8aa8',
  border: '#e9ddf4',
  borderStrong: '#d9c7ec',
  surface: '#f8f3fc',
}

const KIND = { WEB: 'Web', MOBILE: 'Mobile', API: 'API', WORKER: 'Worker', DATABASE: 'Base de datos' } as const

const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
/** The built-in PDF fonts only cover Latin-1: replace the few symbols we use in the UI. */
const t = (s: string) => s.replace(/→/g, '->').replace(/[−–—]/g, '-').replace(/≈/g, '~').replace(/[“”]/g, '"')

// A4 = 595 x 842 pt
const A4 = { short: 595, long: 842 }
const PAGE = { margin: 32 }
const HEADER_H = 40
const FOOTER_H = 28

const styles = StyleSheet.create({
  page: { padding: PAGE.margin, paddingBottom: PAGE.margin + FOOTER_H - 12, fontSize: 9, color: C.text, fontFamily: 'Helvetica' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.brandDark },
  subtitle: { fontSize: 9, color: C.soft, marginTop: 2 },
  footer: { position: 'absolute', bottom: 16, left: PAGE.margin, right: PAGE.margin, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.faint },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.border },
  th: { backgroundColor: C.surface, borderBottomWidth: 1.5, borderBottomColor: C.borderStrong },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.faint, textTransform: 'uppercase' },
  cell: { paddingVertical: 5, paddingHorizontal: 5 },
})

const COLUMNS = [
  { header: 'Contenedor', width: '17%' },
  { header: 'Tipo / tecnología', width: '14%' },
  { header: 'Responsabilidad', width: '23%' },
  { header: 'Módulos que aloja', width: '28%' },
  { header: 'Se comunica con', width: '18%' },
]

export interface PdfInput {
  notebookName: string
  proposal: Proposal
  option: ProposalOption
  diagram: DiagramImage | null
  /** label of the comparison base when the diagram is in diff mode */
  comparisonLabel: string | null
}

export function ProposalPdf({ notebookName, proposal, option, diagram, comparisonLabel }: PdfInput) {
  const arch = proposal.architecture
  const scopeLabel = `v${proposal.version} · ${option.label}`
  const title = `Diagrama C4 nivel 2 · ${notebookName}`
  const subtitle = `${scopeLabel}${comparisonLabel ? ` comparado con ${comparisonLabel}` : ''} · ${new Date().toLocaleDateString('es-AR')}`

  // tall diagrams go on a portrait page; fit the whole image keeping its aspect ratio
  const portrait = diagram ? diagram.height > diagram.width : false
  const pageW = portrait ? A4.short : A4.long
  const pageH = portrait ? A4.long : A4.short
  const maxW = pageW - PAGE.margin * 2
  const maxH = pageH - PAGE.margin * 2 - HEADER_H - FOOTER_H
  const scale = diagram ? Math.min(maxW / diagram.width, maxH / diagram.height) : 1

  const rows = arch.containers.map((container) => {
    const modules = option.modules.filter((m) => m.containerKey === container.key)
    const calls = container.calls.map((key) => arch.containers.find((c) => c.key === key)?.name ?? key)
    const usedBy = arch.actors.filter((a) => a.uses.includes(container.key)).map((a) => `${a.name} (actor)`)
    const systems = [...new Set(modules.flatMap((m) => m.integrations))].map(
      (key) => `${arch.externalSystems.find((s) => s.key === key)?.name ?? key} (externo)`,
    )
    return [
      container.name,
      `${KIND[container.kind]} · ${container.technology || '-'}`,
      container.description || '-',
      modules.length
        ? modules
            .map((m) => `${m.name}${m.variant === 'REDUCED' ? ' (reducido)' : ''}: ${numberFormat.format(m.totalHours)} h`)
            .join('\n')
        : '-',
      [...usedBy, ...calls, ...systems].join('\n') || '-',
    ]
  })

  const footer = (
    <View style={styles.footer} fixed>
      <Text>{t(`${notebookName} · ${scopeLabel}`)}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  )

  return (
    <Document title={t(title)} author="Estimador de propuestas">
      {diagram && (
        <Page size="A4" orientation={portrait ? 'portrait' : 'landscape'} style={styles.page}>
          <View style={{ height: HEADER_H }}>
            <Text style={styles.title}>{t(title)}</Text>
            <Text style={styles.subtitle}>{t(subtitle)}</Text>
          </View>
          <View style={{ height: maxH, alignItems: 'center', justifyContent: 'center' }}>
            <Image src={diagram.dataUrl} style={{ width: diagram.width * scale, height: diagram.height * scale }} />
          </View>
          {footer}
        </Page>
      )}

      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={{ height: HEADER_H }}>
          <Text style={styles.title}>Contenedores del diagrama</Text>
          <Text style={styles.subtitle}>{t(subtitle)}</Text>
        </View>
        <View style={[styles.tr, styles.th]} fixed>
          {COLUMNS.map((col) => (
            <Text key={col.header} style={[styles.cell, styles.thText, { width: col.width }]}>
              {col.header}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            {row.map((value, j) => (
              <Text key={j} style={[styles.cell, { width: COLUMNS[j].width }, j === 0 ? { fontFamily: 'Helvetica-Bold' } : {}]}>
                {t(value)}
              </Text>
            ))}
          </View>
        ))}
        {footer}
      </Page>
    </Document>
  )
}
