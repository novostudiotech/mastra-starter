import { Injectable, Logger } from '@nestjs/common';
import { MastraService } from '#/mastra-module/mastra.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly mastraService: MastraService) {}

  async getThreadsByUser(userId: string) {
    const mastra = this.mastraService.getMastra();
    const memory = mastra.getMemory('chat');
    if (!memory) {
      return [];
    }
    // listThreads doesn't filter by resourceId, so list all and filter
    const result = await memory.listThreads({});
    const threads = Array.isArray(result) ? result : ((result as any).threads ?? []);
    return threads.filter((t: any) => t.resourceId === userId);
  }

  async getMessages(threadId: string) {
    const mastra = this.mastraService.getMastra();
    const memory = mastra.getMemory('chat');
    if (!memory) {
      return [];
    }
    const result = await memory.recall({ threadId });
    return result.messages;
  }

  async deleteThread(threadId: string) {
    const mastra = this.mastraService.getMastra();
    const memory = mastra.getMemory('chat');
    if (!memory) {
      return;
    }
    await memory.deleteThread(threadId);
    this.logger.log(`Deleted thread ${threadId}`);
  }
}
