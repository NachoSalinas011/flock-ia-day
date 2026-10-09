import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NotebookStatus } from '@prisma/client';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalsRepository } from '../proposals/proposals.repository';
import { RetrievalService } from '../sources/retrieval.service';
import { SourcesService } from '../sources/sources.service';

/**
 * Loads the fictional closed projects from /seed as CLOSED notebooks:
 * their documents as indexed sources + their formal proposal with actual hours.
 * Idempotent: re-running replaces each project (matched by code).
 */
async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const sources = app.get(SourcesService);
  const retrieval = app.get(RetrievalService);
  const proposals = app.get(ProposalsRepository);
  const seedDir = process.env.SEED_DIR ?? resolve(process.cwd(), '../../seed');

  const folders = readdirSync(seedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(seedDir, entry.name))
    .sort();

  for (const folder of folders) {
    const data = JSON.parse(
      readFileSync(join(folder, 'estimacion.json'), 'utf8'),
    );
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
      .filter((file) => file.endsWith('.md'))
      .sort();
    for (const file of documents) {
      await sources.ingestNow(
        notebook.id,
        file,
        readFileSync(join(folder, file)),
      );
    }

    // Link each module to the client documents (brief, kickoff) that describe it.
    const sourceChunkIds = await Promise.all(
      data.modules.map(async (module: any) => {
        const hits = await retrieval.search(
          `${module.name}: ${module.description}`,
          [notebook.id],
          10,
        );
        return hits
          .filter((hit) => /^0[12]-/.test(hit.filename))
          .slice(0, 2)
          .map((hit) => hit.id);
      }),
    );

    // Closed projects keep a single option: the formal one that was sold.
    await proposals.createWithOptions(
      {
        notebookId: notebook.id,
        summary: project.summary,
        assumptions: [],
        outOfScope: [],
        risks: [],
        openQuestions: [],
        lessons: data.lessons,
        model: 'seed',
        architecture: { ...data.architecture, inferred: false },
      },
      data.modules.map((module: any, position: number) => ({
        position,
        name: module.name,
        description: module.description,
        complexity: module.complexity,
        confidence: 'HIGH',
        priority: 'MUST',
        estimatedHours: module.estimatedHours,
        actualHours: module.actualHours,
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
          modules: data.modules.map((_: unknown, position: number) => ({
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
