import { Module } from '@nestjs/common';
import { NotebooksModule } from '../notebooks/notebooks.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { SourcesModule } from '../sources/sources.module';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  imports: [NotebooksModule, SourcesModule, ProposalsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
})
export class ChatModule {}
