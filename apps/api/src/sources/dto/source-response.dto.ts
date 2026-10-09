import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceStatus, SourceType } from '@prisma/client';

export class SourceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() notebookId: string;
  @ApiProperty({ enum: SourceType }) type: SourceType;
  @ApiProperty() filename: string;
  @ApiProperty({ enum: SourceStatus }) status: SourceStatus;
  @ApiPropertyOptional({ nullable: true }) errorMessage: string | null;
  @ApiProperty() chunksCount: number;
  @ApiProperty() createdAt: Date;
}

export class UploadSourcesApiDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  files: unknown[];
}
