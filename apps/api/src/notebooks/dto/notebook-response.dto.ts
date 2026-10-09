import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotebookStatus } from '@prisma/client';

export class NotebookResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) client: string | null;
  @ApiPropertyOptional({ nullable: true }) industry: string | null;
  @ApiPropertyOptional({ nullable: true }) code: string | null;
  @ApiPropertyOptional({ nullable: true }) year: number | null;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: NotebookStatus }) status: NotebookStatus;
  @ApiProperty() sourcesCount: number;
  @ApiProperty() proposalsCount: number;
  @ApiProperty() createdAt: Date;
}
