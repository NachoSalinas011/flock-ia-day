import { pdf, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { ProposalPdf, type PdfInput } from './ProposalPdf'

/** Renders the PDF in the browser and triggers the download (loaded on demand). */
export async function downloadProposalPdf(input: PdfInput): Promise<void> {
  const document = createElement(ProposalPdf, input) as unknown as ReactElement<DocumentProps>
  const blob = await pdf(document).toBlob()
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  const slug = input.notebookName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
  link.download = `modulos-${slug}-v${input.proposal.version}-${input.option.tier.toLowerCase()}.pdf`
  link.href = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
