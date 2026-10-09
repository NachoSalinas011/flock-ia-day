import { NotebookResponseDto } from '../notebooks/dto/notebook-response.dto';
import {
  ProposalOptionResponseDto,
  ProposalResponseDto,
} from './dto/proposal-response.dto';
import { renderC4Mermaid } from './proposal.mermaid';

const LEVEL_LABEL = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' } as const;
const PRIORITY_LABEL = {
  MUST: 'Indispensable',
  SHOULD: 'Importante',
  COULD: 'Deseable',
} as const;
const fmt = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('es-AR', { maximumFractionDigits: 1 });
const list = (items: string[]) =>
  items.length ? items.map((i) => `- ${i}`).join('\n') : '- (ninguno)';
const date = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—';

export function renderProposalMarkdown(
  notebook: NotebookResponseDto,
  p: ProposalResponseDto,
): string {
  const optionHeader = p.options.map((o) => o.label).join(' | ');
  const columns = p.options.map(() => '---').join('|');
  const summaryRows = [
    ['Módulos', ...p.options.map((o) => String(o.modules.length))],
    [
      'Esfuerzo total (h)',
      ...p.options.map((o) => fmt(o.estimation.totalHours)),
    ],
    [
      'Duración (días hábiles)',
      ...p.options.map((o) => fmt(o.estimation.team.durationDays)),
    ],
    [
      'Personas en el equipo',
      ...p.options.map((o) =>
        String(o.team.reduce((acc, t) => acc + t.count, 0)),
      ),
    ],
    [
      '¿Entra en la fecha objetivo?',
      ...p.options.map((o) =>
        o.target.fits === null ? '—' : o.target.fits ? 'Sí' : 'No',
      ),
    ],
  ]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const matrix = p.modules
    .map((m) => {
      const cells = p.options.map((o) => {
        const included = o.modules.find((x) => x.id === m.id);
        if (!included) return '—';
        return included.variant === 'REDUCED'
          ? `Reducido (${included.totalHours} h)`
          : `✓ (${included.totalHours} h)`;
      });
      return `| ${m.name} | ${PRIORITY_LABEL[m.priority]} | ${cells.join(' | ')} |`;
    })
    .join('\n');

  return `# Propuesta de esfuerzo — ${notebook.name}

${notebook.client ? `**Cliente:** ${notebook.client}  \n` : ''}**Versión:** ${p.version}
**Fecha:** ${date(p.createdAt)}
**Fecha objetivo:** ${date(p.targetDate)}${p.targetSource ? ` (${p.targetSource})` : ''}

## Resumen
${p.summary}

## Opciones
| | ${optionHeader} |
|---|${columns}|
${summaryRows}

## Alcance de cada opción
| Módulo | Prioridad | ${optionHeader} |
|---|---|${columns}|
${matrix}

${p.options.map(renderOption).join('\n\n')}

## Arquitectura (C4 nivel 2)
\`\`\`mermaid
${renderC4Mermaid(notebook.name, p)}
\`\`\`

## Supuestos
${list(p.assumptions)}

## Fuera de alcance
${list(p.outOfScope)}

## Riesgos
${list(p.risks)}

## Preguntas abiertas
${list(p.openQuestions)}
`;
}

function renderOption(o: ProposalOptionResponseDto): string {
  const e = o.estimation;
  const moduleRows = o.modules
    .map(
      (m) =>
        `| ${m.name}${m.variant === 'REDUCED' ? ' *(reducido)*' : ''} | ${LEVEL_LABEL[m.complexity]} | ${m.estimatedHours.UX} | ${m.estimatedHours.FRONTEND} | ${m.estimatedHours.BACKEND} | ${m.estimatedHours.QA} | **${m.totalHours}** | ${fmt(m.daysFullTime)} | ${fmt(m.daysPartTime)} |`,
    )
    .join('\n');
  const teamRows = o.team
    .map(
      (t) =>
        `| ${t.role} | ${t.seniority} | ${t.count} | ${t.dedication === 'FT' ? 'Full time (8 h)' : 'Part time (4 h)'} |`,
    )
    .join('\n');
  const excluded = o.excludedModules.map((m) => m.name);

  return `## Opción ${o.label}${o.isFormal ? ' — elegida por el cliente' : ''}

| Módulo | Complejidad | UX | FE | BE | QA | Total h | Jornadas FT | Jornadas PT |
|---|---|---|---|---|---|---|---|---|
${moduleRows}

**Esfuerzo:** ${e.devHours} h de desarrollo + ${e.pmHours} h de PM (${o.pmOverheadPct} %) + ${e.contingencyHours} h de contingencia (${o.contingencyPct} %) = **${e.totalHours} h**.
**Duración:** ${e.team.durationDays ?? '—'} días hábiles con este equipo · todo full time: ${e.allFullTime.durationDays ?? '—'} · todo part time: ${e.allPartTime.durationDays ?? '—'}.

| Rol | Seniority | Cantidad | Dedicación |
|---|---|---|---|
${teamRows}
${excluded.length ? `\n**No incluye:** ${excluded.join(', ')}.` : ''}`;
}
