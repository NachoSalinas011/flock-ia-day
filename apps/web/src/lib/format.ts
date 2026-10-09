import type { DevRole, Level, Priority, Role, Seniority, Tier } from './types'

export const ROLE_LABEL: Record<Role, string> = {
  PM: 'PM',
  UX: 'UX',
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  QA: 'QA',
}

export const ROLE_SHORT: Record<DevRole, string> = {
  UX: 'UX',
  FRONTEND: 'FE',
  BACKEND: 'BE',
  QA: 'QA',
}

export const SENIORITY_LABEL: Record<Seniority, string> = { JR: 'Jr', SSR: 'Ssr', SR: 'Sr' }

export const LEVEL_LABEL: Record<Level, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' }

export const LEVEL_CHIP: Record<Level, string> = {
  LOW: 'chip-done',
  MEDIUM: 'chip-progress',
  HIGH: 'chip-blocked',
}

const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '—' : numberFormat.format(n))

export const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${n > 0 ? '+' : ''}${numberFormat.format(n)} %`

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const deviationPct = (estimated: number, actual: number) =>
  estimated > 0 ? Math.round(((actual - estimated) / estimated) * 1000) / 10 : null

export const TIER_LABEL: Record<Tier, string> = { MVP: 'MVP', BALANCED: 'Equilibrada', COMPLETE: 'Completa' }

export const TIER_DESCRIPTION: Record<Tier, string> = {
  MVP: 'Lo mínimo indispensable para salir',
  BALANCED: 'Lo máximo que entra en la fecha objetivo',
  COMPLETE: 'Todo, de punta a punta, con los deseables',
}

export const PRIORITY_LABEL: Record<Priority, string> = { MUST: 'Indispensable', SHOULD: 'Importante', COULD: 'Deseable' }

export const PRIORITY_CHIP: Record<Priority, string> = { MUST: 'chip-blocked', SHOULD: 'chip-progress', COULD: 'chip-pending' }

export const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—'

export const teamSize = (team: { count: number }[]) => team.reduce((acc, m) => acc + m.count, 0)

/** Today as YYYY-MM-DD in the user's time zone (for date inputs; toISOString would give the UTC day). */
export const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const unstaffedText = (roles: DevRole[]) =>
  `Falta asignar: ${roles.map((r) => ROLE_LABEL[r]).join(', ')} — no se puede calcular si entra en la fecha`
