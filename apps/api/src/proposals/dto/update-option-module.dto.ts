import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScopeVariant } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateOptionModuleDto {
  @ApiProperty({ description: 'Incluir o excluir el módulo de esta opción' })
  @IsBoolean()
  included: boolean;

  @ApiPropertyOptional({ enum: ScopeVariant, default: ScopeVariant.FULL })
  @IsOptional()
  @IsEnum(ScopeVariant)
  variant?: ScopeVariant;
}
