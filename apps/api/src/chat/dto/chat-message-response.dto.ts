import { ApiProperty } from '@nestjs/swagger';
import { ChatRole } from '@prisma/client';

export class CitationDto {
  @ApiProperty() index: number;
  @ApiProperty() chunkId: string;
  @ApiProperty() sourceId: string;
  @ApiProperty() filename: string;
  @ApiProperty() notebookId: string;
  @ApiProperty() notebookName: string;
  @ApiProperty() location: string;
  @ApiProperty() excerpt: string;
  @ApiProperty() fromHistory: boolean;
}

export class ChatMessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ChatRole }) role: ChatRole;
  @ApiProperty() content: string;
  @ApiProperty({ type: [CitationDto] }) citations: CitationDto[];
  @ApiProperty() createdAt: Date;
}
