import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NotebookStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalsRepository } from '../proposals/proposals.repository';
import { detectSourceType } from '../sources/ingestion/text-extractor';
import { RetrievalService } from '../sources/retrieval.service';
import { SourcesService } from '../sources/sources.service';

const DATA_FILE = 'estimacion.json';

const hours = z.object({
  UX: z.number().min(0).default(0),
  FRONTEND: z.number().min(0).default(0),
  BACKEND: z.number().min(0).default(0),
  QA: z.number().min(0).default(0),
});

/** Shape of seed/<proyecto>/estimacion.json (documented in seed/README.md). */
const historicalProjectSchema = z.object({
  project: z.object({
    code: z
      .string()
      .min(1, 'project.code es obligatorio y único (ej. "P-2025-07")'),
    name: z.string().min(1),
    client: z.string().optional(),
    industry: z.string().optional(),
    year: z.number().int().optional(),
    summary: z.string().optional(),
  }),
  parameters: z
    .object({
      pmOverheadPct: z.number().min(0).max(50).default(15),
      contingencyPct: z.number().min(0).max(50).default(10),
    })
    .default({}),
  team: z
    .array(
      z.object({
        role: z.enum(['PM', 'UX', 'FRONTEND', 'BACKEND', 'QA']),
        seniority: z.enum(['JR', 'SSR', 'SR']),
        count: z.number().int().min(1).default(1),
        dedication: z.enum(['FT', 'PT']),
      }),
    )
    .min(1, 'el equipo vendido no puede estar vacío'),
  modules: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().default(''),
        complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        estimatedHours: hours,
        actualHours: hours.nullable().default(null),
        notes: z.string().nullable().default(null),
        container: z.string().nullable().default(null),
        integrations: z.array(z.string()).default([]),
        dependsOn: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  lessons: z.array(z.string()).default([]),
  architecture: z
    .object({
      actors: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
          description: z.string().default(''),
          uses: z.array(z.string()).default([]),
        }),
      ),
      containers: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
          technology: z.string().default(''),
          kind: z.enum(['WEB', 'MOBILE', 'API', 'WORKER', 'DATABASE']),
          description: z.string().default(''),
          calls: z.array(z.string()).default([]),
        }),
      ),
      externalSystems: z
        .array(
          z.object({
            key: z.string(),
            name: z.string(),
            description: z.string().default(''),
          }),
        )
        .default([]),
    })
    .nullable()
    .default(null),
});

type HistoricalProject = z.infer<typeof historicalProjectSchema>;

/**
 * Loads closed historical projects from /seed as CLOSED notebooks: their
 * documents as indexed sources + their formal (sold) proposal with actual hours.
 * Folders starting with "_" (e.g. _plantilla) are ignored.
 * Idempotent: re-running replaces each project (matched by project.code).
 */
async function seed() {
  const logger = new Logger('Seed');
  const seedDir = process.env.SEED_DIR ?? resolve(process.cwd(), '../../seed');
  const folders = readdirSync(seedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(seedDir, entry.name))
    .sort();

  // Validate everything before touching the database.
  const projects: { folder: string; data: HistoricalProject }[] = [];
  const errors: string[] = [];
  for (const folder of folders) {
    try {
      const raw = JSON.parse(readFileSync(join(folder, DATA_FILE), 'utf8'));
      const parsed = historicalProjectSchema.safeParse(raw);
      if (parsed.success) {
        projects.push({ folder, data: parsed.data });
      } else {
        errors.push(
          ...parsed.error.issues.map(
            (issue) =>
              `${folder}/${DATA_FILE} → ${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
          ),
        );
      }
    } catch (error) {
      errors.push(
        `${folder}/${DATA_FILE} → ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (errors.length) {
    errors.forEach((e) => logger.error(e));
    logger.error(
      'No se cargó nada: corregí los errores de arriba y volvé a correr el seed.',
    );
    process.exitCode = 1;
    return;
  }
  if (!projects.length) {
    logger.warn(
      `No hay proyectos en ${seedDir} (las carpetas que empiezan con "_" se ignoran).`,
    );
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const sources = app.get(SourcesService);
  const retrieval = app.get(RetrievalService);
  const proposals = app.get(ProposalsRepository);

  for (const { folder, data } of projects) {
    const { project, parameters } = data;

    await prisma.notebook.deleteMany({ where: { code: project.code } });
    const notebook = await prisma.notebook.create({
      data: {
        name: project.name,
        client: project.client,
        industry: project.industry,
        code: project.code,
        year: project.year,
        status: NotebookStatus.CLOSED,
        description: project.summary,
      },
    });

    const documents = readdirSync(folder)
      .filter((file) => file !== DATA_FILE && detectSourceType(file))
      .sort();
    for (const file of documents) {
      await sources.ingestNow(
        notebook.id,
        file,
        readFileSync(join(folder, file)),
      );
    }

    // Link each module to the documents that describe it best.
    const sourceChunkIds = await Promise.all(
      data.modules.map(async (module) => {
        const hits = await retrieval.search(
          `${module.name}: ${module.description}`,
          [notebook.id],
          2,
        );
        return hits.map((hit) => hit.id);
      }),
    );

    // Closed projects keep a single option: the formal one that was sold.
    await proposals.createWithOptions(
      {
        notebookId: notebook.id,
        summary: project.summary ?? '',
        assumptions: [],
        outOfScope: [],
        risks: [],
        openQuestions: [],
        lessons: data.lessons,
        model: 'seed',
        architecture: data.architecture
          ? {
              ...data.architecture,
              inferred: false,
            }
          : Prisma.DbNull,
      },
      data.modules.map((module, position) => ({
        position,
        name: module.name,
        description: module.description,
        complexity: module.complexity,
        confidence: 'HIGH',
        priority: 'MUST',
        estimatedHours: module.estimatedHours,
        actualHours: module.actualHours ?? Prisma.DbNull,
        notes: module.notes,
        containerKey: module.container,
        integrations: module.integrations,
        dependsOn: module.dependsOn,
        sourceChunkIds: sourceChunkIds[position],
      })),
      [
        {
          tier: 'COMPLETE',
          isFormal: true,
          pmOverheadPct: parameters.pmOverheadPct,
          contingencyPct: parameters.contingencyPct,
          team: data.team,
          modules: data.modules.map((_, position) => ({
            position,
            variant: 'FULL' as const,
          })),
        },
      ],
    );
    logger.log(
      `${project.name}: ${documents.length} fuentes + propuesta formal`,
    );
  }

  await app.close();
}

void seed();
