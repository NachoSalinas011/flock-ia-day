import { ChatMessage } from '@prisma/client';
import {
  ChatMessageResponseDto,
  CitationDto,
} from './dto/chat-message-response.dto';

export class ChatMapper {
  static toResponse(message: ChatMessage): ChatMessageResponseDto {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      citations: message.citations as unknown as CitationDto[],
      createdAt: message.createdAt,
    };
  }
}
