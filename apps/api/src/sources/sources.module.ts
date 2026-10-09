import { Module } from '@nestjs/common';
import { NotebooksModule } from '../notebooks/notebooks.module';
import { RetrievalService } from './retrieval.service';
import { SourcesController } from './sources.controller';
import { SourcesRepository } from './sources.repository';
import { SourcesService } from './sources.service';

@Module({
  imports: [NotebooksModule],
  controllers: [SourcesController],
  providers: [SourcesService, SourcesRepository, RetrievalService],
  exports: [SourcesService, RetrievalService],
})
export class SourcesModule {}
