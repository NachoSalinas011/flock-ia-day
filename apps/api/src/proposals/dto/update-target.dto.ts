import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, ValidateIf } from 'class-validator';

export class UpdateTargetDto {
  @ApiPropertyOptional({
    nullable: true,
    example: '2026-12-15',
    description: 'Fecha objetivo para la opción Equilibrada (null = estimada)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  targetDate: string | null;
}
