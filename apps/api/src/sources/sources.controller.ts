import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTextSourceDto } from './dto/create-text-source.dto';
import {
  SourceResponseDto,
  UploadSourcesApiDto,
} from './dto/source-response.dto';
import { SourcesService } from './sources.service';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

@ApiTags('sources')
@Controller()
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post('notebooks/:notebookId/sources')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiOperation({
    summary: 'Subir fuentes (md, txt, pdf, docx); se procesan en segundo plano',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadSourcesApiDto })
  @ApiCreatedResponse({ type: [SourceResponseDto] })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  upload(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.sourcesService.uploadFiles(notebookId, files);
  }

  @Post('notebooks/:notebookId/sources/text')
  @ApiOperation({ summary: 'Agregar una fuente de texto pegado' })
  @ApiCreatedResponse({ type: SourceResponseDto })
  @ApiNotFoundResponse()
  createText(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Body() dto: CreateTextSourceDto,
  ) {
    return this.sourcesService.createText(notebookId, dto);
  }

  @Get('notebooks/:notebookId/sources')
  @ApiOperation({ summary: 'Listar las fuentes de un notebook con su estado' })
  @ApiOkResponse({ type: [SourceResponseDto] })
  @ApiNotFoundResponse()
  findAll(@Param('notebookId', ParseUUIDPipe) notebookId: string) {
    return this.sourcesService.findByNotebook(notebookId);
  }

  @Get('sources/:id/text')
  @ApiOperation({ summary: 'Texto extraído de una fuente' })
  @ApiNotFoundResponse()
  getText(@Param('id', ParseUUIDPipe) id: string) {
    return this.sourcesService.getRawText(id);
  }

  @Delete('sources/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar una fuente y sus chunks' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sourcesService.remove(id);
  }
}
