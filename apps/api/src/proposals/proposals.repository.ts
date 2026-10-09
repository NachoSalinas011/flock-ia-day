import { Injectable } from '@nestjs/common';
import { NotebookStatus, Prisma, ScopeVariant, Tier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const proposalInclude = {
  modules: { orderBy: { position: 'asc' } },
  options: {
    orderBy: { tier: 'asc' },
    include: { team: { orderBy: { role: 'asc' } }, modules: true },
  },
} satisfies Prisma.ProposalInclude;

export type ProposalWithRelations = Prisma.ProposalGetPayload<{
  include: typeof proposalInclude;
}>;

export type TeamInput = Omit<
  Prisma.TeamMemberCreateManyInput,
  'optionId' | 'id'
>;

export interface OptionInput {
  tier: Tier;
  isFormal?: boolean;
  pmOverheadPct: number;
  contingencyPct: number;
  team: TeamInput[];
  /** positions in the module list, with the variant each option uses */
  modules: { position: number; variant: ScopeVariant }[];
}

@Injectable()
export class ProposalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates the next version of a notebook's proposal with its module catalog
   * and the scope options that reference it, atomically. The version is
   * computed inside the transaction; if a concurrent generation took the same
   * number (unique notebookId+version), the whole create is retried once.
   */
  async createWithOptions(
    data: Omit<
      Prisma.ProposalUncheckedCreateInput,
      'modules' | 'options' | 'version'
    >,
    modules: Omit<Prisma.ProposalModuleCreateManyInput, 'proposalId' | 'id'>[],
    options: OptionInput[],
  ): Promise<ProposalWithRelations> {
    let id: string;
    try {
      id = await this.createVersion(data, modules, options);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      id = await this.createVersion(data, modules, options);
    }
    return (await this.findById(id))!;
  }

  private createVersion(
    data: Omit<
      Prisma.ProposalUncheckedCreateInput,
      'modules' | 'options' | 'version'
    >,
    modules: Omit<Prisma.ProposalModuleCreateManyInput, 'proposalId' | 'id'>[],
    options: OptionInput[],
  ): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const { _max } = await tx.proposal.aggregate({
        where: { notebookId: data.notebookId },
        _max: { version: true },
      });
      const proposal = await tx.proposal.create({
        data: {
          ...data,
          version: (_max.version ?? 0) + 1,
          modules: { createMany: { data: modules } },
        },
        include: { modules: true },
      });
      const idByPosition = new Map(
        proposal.modules.map((m) => [m.position, m.id]),
      );
      for (const option of options) {
        await tx.proposalOption.create({
          data: {
            proposalId: proposal.id,
            tier: option.tier,
            isFormal: option.isFormal ?? false,
            pmOverheadPct: option.pmOverheadPct,
            contingencyPct: option.contingencyPct,
            team: { createMany: { data: option.team } },
            modules: {
              createMany: {
                data: option.modules.map((m) => ({
                  moduleId: idByPosition.get(m.position)!,
                  variant: m.variant,
                })),
              },
            },
          },
        });
      }
      return proposal.id;
    });
  }

  findByNotebook(notebookId: string): Promise<ProposalWithRelations[]> {
    return this.prisma.proposal.findMany({
      where: { notebookId },
      include: proposalInclude,
      orderBy: { version: 'desc' },
    });
  }

  findById(id: string): Promise<ProposalWithRelations | null> {
    return this.prisma.proposal.findUnique({
      where: { id },
      include: proposalInclude,
    });
  }

  findOption(optionId: string) {
    return this.prisma.proposalOption.findUnique({
      where: { id: optionId },
      include: { proposal: { select: { notebookId: true } } },
    });
  }

  /** Formal proposals of closed projects: the calibration dataset. */
  findHistoricalFormal() {
    return this.prisma.proposal.findMany({
      where: {
        notebook: { status: NotebookStatus.CLOSED },
        options: { some: { isFormal: true } },
      },
      include: { modules: { orderBy: { position: 'asc' } }, notebook: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Only one formal option per notebook, across all versions. */
  async markFormal(optionId: string, notebookId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockOption(tx, optionId);
      await tx.proposalOption.updateMany({
        where: { proposal: { notebookId }, isFormal: true },
        data: { isFormal: false },
      });
      await tx.proposalOption.update({
        where: { id: optionId },
        data: { isFormal: true },
      });
    });
  }

  async replaceTeam(optionId: string, team: TeamInput[]) {
    await this.prisma.$transaction(async (tx) => {
      await lockOption(tx, optionId);
      await tx.teamMember.deleteMany({ where: { optionId } });
      await tx.teamMember.createMany({
        data: team.map((member) => ({ ...member, optionId })),
      });
    });
  }

  updateOption(optionId: string, data: Prisma.ProposalOptionUpdateInput) {
    return this.prisma.proposalOption.update({
      where: { id: optionId },
      data,
    });
  }

  async setOptionModule(
    optionId: string,
    moduleId: string,
    included: boolean,
    variant: ScopeVariant,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await lockOption(tx, optionId);
      if (!included) {
        await tx.proposalOptionModule.deleteMany({
          where: { optionId, moduleId },
        });
        return;
      }
      await tx.proposalOptionModule.upsert({
        where: { optionId_moduleId: { optionId, moduleId } },
        create: { optionId, moduleId, variant },
        update: { variant },
      });
    });
  }

  async replaceOptionModules(
    optionId: string,
    modules: { moduleId: string; variant: ScopeVariant }[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      await lockOption(tx, optionId);
      await tx.proposalOptionModule.deleteMany({ where: { optionId } });
      await tx.proposalOptionModule.createMany({
        data: modules.map((m) => ({ ...m, optionId })),
      });
    });
  }

  update(id: string, data: Prisma.ProposalUpdateInput) {
    return this.prisma.proposal.update({ where: { id }, data });
  }

  findModule(proposalId: string, moduleId: string) {
    return this.prisma.proposalModule.findFirst({
      where: { id: moduleId, proposalId },
    });
  }

  updateModule(moduleId: string, data: Prisma.ProposalModuleUpdateInput) {
    return this.prisma.proposalModule.update({
      where: { id: moduleId },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.proposal.delete({ where: { id } });
  }
}

/**
 * Serializes concurrent edits of the same option: writes that delete and
 * re-create its rows would otherwise interleave under READ COMMITTED.
 */
async function lockOption(tx: Prisma.TransactionClient, optionId: string) {
  await tx.$queryRaw`SELECT id FROM "ProposalOption" WHERE id = ${optionId} FOR UPDATE`;
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
