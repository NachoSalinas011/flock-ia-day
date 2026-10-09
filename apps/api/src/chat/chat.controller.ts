import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@Controller('notebooks/:notebookId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Preguntar sobre las fuentes (respuesta con citas)',
  })
  @ApiCreatedResponse({ type: ChatMessageResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Modelo de IA no disponible' })
  @ApiNotFoundResponse()
  send(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.send(notebookId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Historial del chat' })
  @ApiOkResponse({ type: [ChatMessageResponseDto] })
  @ApiNotFoundResponse()
  findAll(@Param('notebookId', ParseUUIDPipe) notebookId: string) {
    return this.chatService.findByNotebook(notebookId);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Borrar el historial del chat' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  clear(@Param('notebookId', ParseUUIDPipe) notebookId: string) {
    return this.chatService.clear(notebookId);
  }
}
