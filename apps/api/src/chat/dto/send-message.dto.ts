import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: '¿Qué integraciones con terceros menciona el cliente?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Incluir proyectos históricos en la búsqueda',
  })
  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean;
}
