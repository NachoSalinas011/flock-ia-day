import { z } from 'zod';

const hours = z.coerce.number().min(0).max(2000).transform(Math.round);
const stringList = z.array(z.string()).catch([]).default([]);
const containerKind = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  z.enum(['WEB', 'MOBILE', 'API', 'WORKER', 'DATABASE']).catch('API'),
);

/** Any problem in the architecture must not discard the estimate: it falls back to null. */
const architectureSchema = z
  .object({
    actors: z
      .array(
        z.object({
          key: z.string().default(''),
          name: z.string(),
          description: z.string().default(''),
          uses: stringList,
        }),
      )
      .default([]),
    containers: z
      .array(
        z.object({
          key: z.string().default(''),
          name: z.string(),
          technology: z.string().default(''),
          kind: containerKind,
          description: z.string().default(''),
          calls: stringList,
        }),
      )
      .default([]),
    externalSystems: z
      .array(
        z.object({
          key: z.string().default(''),
          name: z.string(),
          description: z.string().default(''),
        }),
      )
      .default([]),
  })
  .nullable()
  .catch(null)
  .default(null);

const level = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  z.enum(['LOW', 'MEDIUM', 'HIGH']),
);

const teamSchema = z
  .array(
    z.object({
      role: z.preprocess(
        (v) => (typeof v === 'string' ? v.toUpperCase() : v),
        z.enum(['PM', 'UX', 'FRONTEND', 'BACKEND', 'QA']),
      ),
      seniority: z.preprocess(
        (v) => (typeof v === 'string' ? v.toUpperCase() : v),
        z.enum(['JR', 'SSR', 'SR']),
      ),
      count: z.coerce.number().int().min(1).max(10).default(1),
      dedication: z.preprocess(
        (v) => (typeof v === 'string' ? v.toUpperCase() : v),
        z.enum(['FT', 'PT']),
      ),
    }),
  )
  .catch([])
  .default([]);

/** Shape the LLM must return; validated before anything is persisted. */
export const generatedProposalSchema = z.object({
  summary: z.string().min(1),
  modules: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().default(''),
        complexity: level,
        confidence: level.catch('MEDIUM'),
        estimatedHours: z.object({
          UX: hours.default(0),
          FRONTEND: hours.default(0),
          BACKEND: hours.default(0),
          QA: hours.default(0),
        }),
        rationale: z.string().default(''),
        analogies: z
          .array(z.object({ project: z.string(), module: z.string() }))
          .default([]),
        sourceRefs: z.array(z.string()).default([]),
        priority: z.preprocess(
          (v) => (typeof v === 'string' ? v.toUpperCase() : v),
          z.enum(['MUST', 'SHOULD', 'COULD']).catch('SHOULD'),
        ),
        reducedScope: z
          .object({
            description: z.string().min(1),
            estimatedHours: z.object({
              UX: hours.default(0),
              FRONTEND: hours.default(0),
              BACKEND: hours.default(0),
              QA: hours.default(0),
            }),
          })
          .nullable()
          .catch(null)
          .default(null),
        container: z.string().nullable().catch(null).default(null),
        integrations: stringList,
        dependsOn: stringList,
      }),
    )
    .min(1),
  team: teamSchema,
  teams: z
    .object({
      MVP: teamSchema,
      BALANCED: teamSchema,
      COMPLETE: teamSchema,
    })
    .partial()
    .catch({})
    .default({}),
  deadline: z
    .object({
      date: z.string().nullable().default(null),
      quote: z.string().nullable().default(null),
    })
    .nullable()
    .catch(null)
    .default(null),
  assumptions: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  architecture: architectureSchema,
});

export type GeneratedProposal = z.infer<typeof generatedProposalSchema>;

/** Parses the model output, tolerating ```json fences and text around the object. */
export function parseGeneratedProposal(raw: string): GeneratedProposal {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('La respuesta no contiene un objeto JSON.');
  }
  const json = JSON.parse(raw.slice(start, end + 1));
  return generatedProposalSchema.parse(json);
}
