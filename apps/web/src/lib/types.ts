export type NotebookStatus = 'ACTIVE' | 'CLOSED'
export type SourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR'
export type SourceType = 'TEXT' | 'MARKDOWN' | 'PDF' | 'DOCX' | 'VIDEO'
export type Role = 'PM' | 'UX' | 'FRONTEND' | 'BACKEND' | 'QA'
export type DevRole = Exclude<Role, 'PM'>
export type Seniority = 'JR' | 'SSR' | 'SR'
export type Dedication = 'FT' | 'PT'
export type Level = 'LOW' | 'MEDIUM' | 'HIGH'

export const DEV_ROLES: DevRole[] = ['UX', 'FRONTEND', 'BACKEND', 'QA']
export const ROLES: Role[] = ['PM', 'UX', 'FRONTEND', 'BACKEND', 'QA']
export const SENIORITIES: Seniority[] = ['JR', 'SSR', 'SR']

export type RoleHours = Record<DevRole, number>

export interface Notebook {
  id: string
  name: string
  client: string | null
  industry: string | null
  code: string | null
  year: number | null
  description: string | null
  status: NotebookStatus
  sourcesCount: number
  proposalsCount: number
  createdAt: string
}

export interface Source {
  id: string
  notebookId: string
  type: SourceType
  filename: string
  status: SourceStatus
  errorMessage: string | null
  chunksCount: number
  createdAt: string
}

export interface Citation {
  index: number
  chunkId: string
  sourceId: string
  filename: string
  notebookId: string
  notebookName: string
  location: string
  excerpt: string
  fromHistory: boolean
}

export interface ChatMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  citations: Citation[]
  createdAt: string
}

export interface Analogy {
  project: string
  module: string
  estimatedHours: number
  actualHours: number | null
  deviationPct: number | null
}

export type Priority = 'MUST' | 'SHOULD' | 'COULD'
export type ScopeVariant = 'FULL' | 'REDUCED'
export type Tier = 'MVP' | 'BALANCED' | 'COMPLETE'
export const TIERS: Tier[] = ['MVP', 'BALANCED', 'COMPLETE']

export interface ProposalModule {
  id: string
  position: number
  name: string
  /** description of the scope in use (reduced one when variant is REDUCED) */
  description: string
  complexity: Level
  confidence: Level
  priority: Priority
  variant: ScopeVariant
  /** hours of the scope in use */
  estimatedHours: RoleHours
  fullHours: RoleHours
  fullDescription: string | null
  reducedDescription: string | null
  reducedHours: RoleHours | null
  actualHours: RoleHours | null
  totalHours: number
  actualTotalHours: number | null
  daysFullTime: number
  daysPartTime: number
  analogies: Analogy[]
  sourceChunkIds: string[]
  notes: string | null
  containerKey: string | null
  integrations: string[]
  dependsOn: string[]
}

export interface TeamMember {
  id?: string
  role: Role
  seniority: Seniority
  count: number
  dedication: Dedication
}

export interface TeamScenario {
  dailyCapacityByRole: Record<Role, number>
  daysByRole: Record<DevRole, number | null>
  durationDays: number | null
  bottleneckRole: DevRole | null
}

export interface Estimation {
  hoursByRole: RoleHours & { PM: number }
  devHours: number
  pmHours: number
  contingencyHours: number
  totalHours: number
  team: TeamScenario
  allFullTime: TeamScenario
  allPartTime: TeamScenario
  warnings: string[]
}

/** A scope alternative offered to the client: what's included, its team and its numbers. */
export interface ProposalOption {
  id: string
  proposalId: string
  notebookId: string
  version: number
  tier: Tier
  label: string
  isFormal: boolean
  pmOverheadPct: number
  contingencyPct: number
  team: TeamMember[]
  modules: ProposalModule[]
  excludedModules: { id: string; name: string; priority: Priority; totalHours: number }[]
  estimation: Estimation
  actual: { hoursByRole: RoleHours; devHours: number } | null
  /** `unstaffedRoles`: roles with hours but nobody assigned (then `fits` is null) */
  target: { targetDays: number | null; durationDays: number | null; fits: boolean | null; unstaffedRoles: DevRole[] }
}

/** One generation: the module catalog plus its options (MVP, Equilibrada, Completa). */
export interface Proposal {
  id: string
  notebookId: string
  version: number
  summary: string
  assumptions: string[]
  outOfScope: string[]
  risks: string[]
  openQuestions: string[]
  lessons: string[]
  model: string | null
  createdAt: string
  targetDate: string | null
  targetSource: string | null
  targetDays: number | null
  architecture: Architecture
  modules: ProposalModule[]
  options: ProposalOption[]
}

export type ContainerKind = 'WEB' | 'MOBILE' | 'API' | 'WORKER' | 'DATABASE'

export interface Architecture {
  actors: { key: string; name: string; description: string; uses: string[] }[]
  containers: { key: string; name: string; technology: string; kind: ContainerKind; description: string; calls: string[] }[]
  externalSystems: { key: string; name: string; description: string }[]
  inferred: boolean
}

export interface ChunkRef {
  chunkId: string
  sourceId: string
  filename: string
  location: string
  excerpt: string
  score?: number
}

export interface ProposalInsights {
  threshold: number
  coveragePct: number
  sources: { sourceId: string; filename: string }[]
  modules: { moduleId: string; cited: ChunkRef[]; related: ChunkRef[] }[]
  traceability: { moduleId: string; sourceId: string; cited: number; related: number }[]
  uncovered: (ChunkRef & { closestModuleId: string | null })[]
}
