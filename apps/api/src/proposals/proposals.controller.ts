import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { ProposalInsightsDto } from './dto/proposal-insights.dto';
import { ProposalResponseDto } from './dto/proposal-response.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { UpdateOptionModuleDto } from './dto/update-option-module.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateTargetDto } from './dto/update-target.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ProposalInsightsService } from './proposal-insights.service';
import { ProposalsService } from './proposals.service';

@ApiTags('proposals')
@Controller()
export class ProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly insightsService: ProposalInsightsService,
  ) {}

  @Post('notebooks/:notebookId/proposals/generate')
  @ApiOperation({
    summary:
      'Generar una nueva versión con IA: catálogo de módulos y opciones MVP, Equilibrada y Completa',
  })
  @ApiCreatedResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse({
    description: 'Sin fuentes procesadas o respuesta inválida del modelo',
  })
  @ApiServiceUnavailableResponse({ description: 'Modelo de IA no disponible' })
  @ApiNotFoundResponse()
  generate(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Body() dto: GenerateProposalDto,
  ) {
    return this.proposalsService.generate(notebookId, dto);
  }

  @Get('notebooks/:notebookId/proposals')
  @ApiOperation({
    summary: 'Historial de versiones de propuesta (la más nueva primero)',
  })
  @ApiOkResponse({ type: [ProposalResponseDto] })
  @ApiNotFoundResponse()
  findAll(@Param('notebookId', ParseUUIDPipe) notebookId: string) {
    return this.proposalsService.findByNotebook(notebookId);
  }

  @Get('proposals/:id')
  @ApiOperation({
    summary: 'Obtener una propuesta con su estimación calculada',
  })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.findOne(id);
  }

  @Get('proposals/:id/insights')
  @ApiOperation({
    summary: 'Trazabilidad de módulos con las fuentes y requisitos sin cubrir',
  })
  @ApiOkResponse({ type: ProposalInsightsDto })
  @ApiNotFoundResponse()
  insights(@Param('id', ParseUUIDPipe) id: string) {
    return this.insightsService.getInsights(id);
  }

  @Post('options/:optionId/formal')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Marcar una opción como la propuesta formal elegida (desmarca la anterior)',
  })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiNotFoundResponse()
  markFormal(@Param('optionId', ParseUUIDPipe) optionId: string) {
    return this.proposalsService.markFormal(optionId);
  }

  @Put('options/:optionId/team')
  @ApiOperation({ summary: 'Reemplazar el equipo de una opción y recalcular' })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiNotFoundResponse()
  updateTeam(
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.proposalsService.updateTeam(optionId, dto.team);
  }

  @Patch('options/:optionId/settings')
  @ApiOperation({ summary: 'Cambiar % de PM y contingencia de una opción' })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiNotFoundResponse()
  updateSettings(
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.proposalsService.updateSettings(optionId, dto);
  }

  @Put('options/:optionId/modules/:moduleId')
  @ApiOperation({
    summary: 'Incluir o excluir un módulo en una opción (completo o reducido)',
  })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse({ description: 'El módulo no tiene versión reducida' })
  @ApiNotFoundResponse()
  setOptionModule(
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateOptionModuleDto,
  ) {
    return this.proposalsService.setOptionModule(optionId, moduleId, dto);
  }

  @Post('options/:optionId/replan')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Reajustar la opción Equilibrada a la fecha objetivo con su equipo actual',
  })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  replan(@Param('optionId', ParseUUIDPipe) optionId: string) {
    return this.proposalsService.replan(optionId);
  }

  @Patch('proposals/:id/target')
  @ApiOperation({
    summary:
      'Cambiar la fecha objetivo (null = estimada) y reajustar la Equilibrada',
  })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  updateTarget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTargetDto,
  ) {
    return this.proposalsService.updateTarget(id, dto.targetDate ?? null);
  }

  @Patch('proposals/:id/modules/:moduleId')
  @ApiOperation({
    summary:
      'Editar un módulo del catálogo (prioridad, horas completas o reducidas)',
  })
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiNotFoundResponse()
  updateModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.proposalsService.updateModule(id, moduleId, dto);
  }

  @Get('proposals/:id/export.md')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @ApiOperation({ summary: 'Exportar la propuesta en Markdown' })
  @ApiProduces('text/markdown')
  @ApiNotFoundResponse()
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { filename, content } =
      await this.proposalsService.exportMarkdown(id);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return content;
  }

  @Get('proposals/:id/c4.mmd')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Diagrama C4 nivel 2 en sintaxis Mermaid' })
  @ApiProduces('text/plain')
  @ApiNotFoundResponse()
  exportC4(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.exportC4(id);
  }

  @Delete('proposals/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar una versión de propuesta' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalsService.remove(id);
  }
}
