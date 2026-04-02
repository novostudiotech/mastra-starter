import type { Mastra } from '@mastra/core';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '#/app/config';
import { createMastra } from '#/mastra';

@Injectable()
export class MastraService implements OnModuleInit {
  private mastra!: Mastra;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const databaseUrl = this.configService.get('DATABASE_URL');
    this.mastra = createMastra(databaseUrl);
  }

  getMastra(): Mastra {
    return this.mastra;
  }

  getAgent(agentId: string) {
    return this.mastra.getAgent(agentId);
  }
}
