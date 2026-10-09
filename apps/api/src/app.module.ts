import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { LlmModule } from './llm/llm.module';
import { NotebooksModule } from './notebooks/notebooks.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProposalsModule } from './proposals/proposals.module';
import { SourcesModule } from './sources/sources.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    LlmModule,
    EmbeddingsModule,
    NotebooksModule,
    SourcesModule,
    ChatModule,
    ProposalsModule,
  ],
})
export class AppModule {}
