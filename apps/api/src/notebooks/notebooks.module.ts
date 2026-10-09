import { Module } from '@nestjs/common';
import { NotebooksController } from './notebooks.controller';
import { NotebooksRepository } from './notebooks.repository';
import { NotebooksService } from './notebooks.service';

@Module({
  controllers: [NotebooksController],
  providers: [NotebooksService, NotebooksRepository],
  exports: [NotebooksService],
})
export class NotebooksModule {}
