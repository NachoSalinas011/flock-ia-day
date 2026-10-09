import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateNotebookDto } from './dto/create-notebook.dto';
import { ListNotebooksQueryDto } from './dto/list-notebooks-query.dto';
import { NotebookResponseDto } from './dto/notebook-response.dto';
import { NotebooksService } from './notebooks.service';

@ApiTags('notebooks')
@Controller('notebooks')
export class NotebooksController {
  constructor(private readonly notebooksService: NotebooksService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un notebook (oportunidad comercial)' })
  @ApiCreatedResponse({ type: NotebookResponseDto })
  create(@Body() dto: CreateNotebookDto) {
    return this.notebooksService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar notebooks (ACTIVE = oportunidades, CLOSED = histórico)',
  })
  @ApiOkResponse({ type: [NotebookResponseDto] })
  findAll(@Query() query: ListNotebooksQueryDto) {
    return this.notebooksService.findAll(query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un notebook' })
  @ApiOkResponse({ type: NotebookResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notebooksService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un notebook y todo su contenido' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notebooksService.remove(id);
  }
}
