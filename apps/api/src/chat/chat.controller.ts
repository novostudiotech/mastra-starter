import { Controller, Delete, Get, Param, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('api/chats')
@OptionalAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'List chat threads for current user' })
  @ApiResponse({ status: 200, description: 'List of threads' })
  async listThreads(@Session() session: UserSession | null) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.chatService.getThreadsByUser(session.user.id);
  }

  @Get(':threadId/messages')
  @ApiOperation({ summary: 'Get messages for a thread' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(@Session() session: UserSession | null, @Param('threadId') threadId: string) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.chatService.getMessages(threadId);
  }

  @Delete(':threadId')
  @ApiOperation({ summary: 'Delete a thread' })
  @ApiResponse({ status: 200, description: 'Thread deleted' })
  async deleteThread(@Session() session: UserSession | null, @Param('threadId') threadId: string) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.chatService.deleteThread(threadId);
    return { success: true };
  }
}
