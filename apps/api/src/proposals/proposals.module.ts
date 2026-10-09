import { Module } from '@nestjs/common';
import { NotebooksModule } from '../notebooks/notebooks.module';
import { SourcesModule } from '../sources/sources.module';
import { ProposalGeneratorService } from './proposal-generator.service';
import { ProposalInsightsService } from './proposal-insights.service';
import { ProposalsController } from './proposals.controller';
import { ProposalsRepository } from './proposals.repository';
import { ProposalsService } from './proposals.service';

@Module({
  imports: [NotebooksModule, SourcesModule],
  controllers: [ProposalsController],
  providers: [
    ProposalsService,
    ProposalsRepository,
    ProposalGeneratorService,
    ProposalInsightsService,
  ],
  exports: [ProposalsService],
})
export class ProposalsModule {}
