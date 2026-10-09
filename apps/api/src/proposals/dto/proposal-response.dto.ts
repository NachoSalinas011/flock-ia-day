import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Dedication,
  Level,
  Priority,
  Role,
  ScopeVariant,
  Seniority,
  Tier,
} from '@prisma/client';
import type { Architecture } from '../architecture';
import type {
  DevRole,
  EstimationResult,
  RoleHours,
} from '../../estimation/estimation.engine';

export class AnalogyDto {
  @ApiProperty() project: string;
  @ApiProperty() module: string;
  @ApiProperty() estimatedHours: number;
  @ApiPropertyOptional({ nullable: true }) actualHours: number | null;
  @ApiPropertyOptional({ nullable: true }) deviationPct: number | null;
}

export class ProposalModuleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() position: number;
  @ApiProperty() name: string;
  @ApiProperty({
    description: 'Descripción del alcance usado (reducido si variant=REDUCED)',
  })
  description: string;
  @ApiProperty({ enum: Level }) complexity: Level;
  @ApiProperty({ enum: Level }) confidence: Level;
  @ApiProperty({ enum: Priority }) priority: Priority;
  @ApiProperty({ enum: ScopeVariant }) variant: ScopeVariant;
  @ApiProperty({ description: 'Horas del alcance usado' })
  estimatedHours: RoleHours;
  @ApiProperty({ description: 'Horas del alcance completo' })
  fullHours: RoleHours;
  @ApiPropertyOptional({ nullable: true }) fullDescription: string | null;
  @ApiPropertyOptional({ nullable: true }) reducedDescription: string | null;
  @ApiPropertyOptional({ nullable: true }) reducedHours: RoleHours | null;
  @ApiPropertyOptional({ nullable: true }) actualHours: RoleHours | null;
  @ApiProperty() totalHours: number;
  @ApiPropertyOptional({ nullable: true }) actualTotalHours: number | null;
  @ApiProperty() daysFullTime: number;
  @ApiProperty() daysPartTime: number;
  @ApiProperty({ type: [AnalogyDto] }) analogies: AnalogyDto[];
  @ApiProperty({ type: [String] }) sourceChunkIds: string[];
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiPropertyOptional({ nullable: true }) containerKey: string | null;
  @ApiProperty({ type: [String] }) integrations: string[];
  @ApiProperty({ type: [String] }) dependsOn: string[];
}

export class TeamMemberResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty({ enum: Seniority }) seniority: Seniority;
  @ApiProperty() count: number;
  @ApiProperty({ enum: Dedication }) dedication: Dedication;
}

export class ExcludedModuleDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: Priority }) priority: Priority;
  @ApiProperty() totalHours: number;
}

export class OptionTargetDto {
  @ApiPropertyOptional({ nullable: true }) targetDays: number | null;
  @ApiPropertyOptional({ nullable: true }) durationDays: number | null;
  @ApiProperty({
    enum: ['UX', 'FRONTEND', 'BACKEND', 'QA'],
    isArray: true,
    description:
      'Roles con horas en los módulos incluidos y nadie asignado (la duración no se puede calcular)',
  })
  unstaffedRoles: DevRole[];
  @ApiPropertyOptional({
    nullable: true,
    description: 'Si la duración entra en la fecha objetivo',
  })
  fits: boolean | null;
}

export class ProposalOptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() proposalId: string;
  @ApiProperty() notebookId: string;
  @ApiProperty() version: number;
  @ApiProperty({ enum: Tier }) tier: Tier;
  @ApiProperty({ example: 'Equilibrada' }) label: string;
  @ApiProperty() isFormal: boolean;
  @ApiProperty() pmOverheadPct: number;
  @ApiProperty() contingencyPct: number;
  @ApiProperty({ type: [TeamMemberResponseDto] }) team: TeamMemberResponseDto[];
  @ApiProperty({
    type: [ProposalModuleResponseDto],
    description: 'Módulos incluidos',
  })
  modules: ProposalModuleResponseDto[];
  @ApiProperty({ type: [ExcludedModuleDto] })
  excludedModules: ExcludedModuleDto[];
  @ApiProperty({
    description: 'Totales, jornadas FT/PT y duración calculados por el motor',
  })
  estimation: EstimationResult;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Horas reales (solo proyectos cerrados)',
  })
  actual: { hoursByRole: RoleHours; devHours: number } | null;
  @ApiProperty({ type: OptionTargetDto }) target: OptionTargetDto;
}

export class ProposalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() notebookId: string;
  @ApiProperty() version: number;
  @ApiProperty() summary: string;
  @ApiProperty({ type: [String] }) assumptions: string[];
  @ApiProperty({ type: [String] }) outOfScope: string[];
  @ApiProperty({ type: [String] }) risks: string[];
  @ApiProperty({ type: [String] }) openQuestions: string[];
  @ApiProperty({ type: [String] }) lessons: string[];
  @ApiPropertyOptional({ nullable: true }) model: string | null;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ nullable: true }) targetDate: Date | null;
  @ApiPropertyOptional({ nullable: true }) targetSource: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Días hábiles desde hoy hasta la fecha objetivo',
  })
  targetDays: number | null;
  @ApiProperty({
    description: 'C4 nivel 2 (actores, contenedores, sistemas externos)',
  })
  architecture: Architecture;
  @ApiProperty({
    type: [ProposalModuleResponseDto],
    description: 'Catálogo completo de módulos',
  })
  modules: ProposalModuleResponseDto[];
  @ApiProperty({
    type: [ProposalOptionResponseDto],
    description: 'MVP, Equilibrada y Completa',
  })
  options: ProposalOptionResponseDto[];
}
