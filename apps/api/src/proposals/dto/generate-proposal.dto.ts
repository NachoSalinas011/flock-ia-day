import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateProposalDto {
  @ApiPropertyOptional({
    example: 'Priorizá un MVP en 2 meses; la app mobile queda fuera.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Ignora la respuesta cacheada del modelo y pide una estimación nueva (consume cuota del LLM)',
  })
  @IsOptional()
  @IsBoolean()
  fresh?: boolean;
}
