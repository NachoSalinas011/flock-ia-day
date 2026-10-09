import { ApiPropertyOptional } from '@nestjs/swagger';
import { Level, Priority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RoleHoursDto {
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(5000) UX: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(5000) FRONTEND: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(5000) BACKEND: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(5000) QA: number;
}

export class UpdateModuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: Level })
  @IsOptional()
  @IsEnum(Level)
  complexity?: Level;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({
    type: RoleHoursDto,
    description: 'Horas del alcance completo',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoleHoursDto)
  estimatedHours?: RoleHoursDto;

  @ApiPropertyOptional({
    type: RoleHoursDto,
    description: 'Horas de la versión reducida',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RoleHoursDto)
  reducedHours?: RoleHoursDto;
}
