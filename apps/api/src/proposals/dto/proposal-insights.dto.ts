import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChunkRefDto {
  @ApiProperty() chunkId: string;
  @ApiProperty() sourceId: string;
  @ApiProperty() filename: string;
  @ApiProperty() location: string;
  @ApiProperty() excerpt: string;
  @ApiPropertyOptional({ description: 'Similitud semántica 0–1' })
  score?: number;
}

export class ModuleEvidenceDto {
  @ApiProperty() moduleId: string;
  @ApiProperty({
    type: [ChunkRefDto],
    description: 'Fragmentos que citó el modelo',
  })
  cited: ChunkRefDto[];
  @ApiProperty({
    type: [ChunkRefDto],
    description: 'Fragmentos semánticamente relacionados',
  })
  related: ChunkRefDto[];
}

export class TraceabilityCellDto {
  @ApiProperty() moduleId: string;
  @ApiProperty() sourceId: string;
  @ApiProperty() cited: number;
  @ApiProperty() related: number;
}

export class UncoveredChunkDto extends ChunkRefDto {
  @ApiPropertyOptional({ nullable: true }) closestModuleId: string | null;
}

export class SourceRefDto {
  @ApiProperty() sourceId: string;
  @ApiProperty() filename: string;
}

export class ProposalInsightsDto {
  @ApiProperty({
    description: 'Umbral de similitud para considerar un fragmento cubierto',
  })
  threshold: number;
  @ApiProperty({
    description: '% de fragmentos relevantes cubiertos por algún módulo',
  })
  coveragePct: number;
  @ApiProperty({ type: [SourceRefDto] }) sources: SourceRefDto[];
  @ApiProperty({ type: [ModuleEvidenceDto] }) modules: ModuleEvidenceDto[];
  @ApiProperty({ type: [TraceabilityCellDto] })
  traceability: TraceabilityCellDto[];
  @ApiProperty({ type: [UncoveredChunkDto] }) uncovered: UncoveredChunkDto[];
}
