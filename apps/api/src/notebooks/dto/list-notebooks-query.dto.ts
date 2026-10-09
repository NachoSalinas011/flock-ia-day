import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotebookStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListNotebooksQueryDto {
  @ApiPropertyOptional({ enum: NotebookStatus })
  @IsOptional()
  @IsEnum(NotebookStatus)
  status?: NotebookStatus;
}
