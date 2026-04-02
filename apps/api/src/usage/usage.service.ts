import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { UsageLogEntity } from './entities/usage-log.entity';

export interface LogUsageParams {
  userId: string;
  action: string;
  model: string;
  threadId?: string;
  inputTokens?: number;
  outputTokens?: number;
  tokensUsed?: number;
  toolCallsCount?: number;
  costCents?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectRepository(UsageLogEntity)
    private readonly usageLogRepo: Repository<UsageLogEntity>
  ) {}

  async logUsage(params: LogUsageParams): Promise<UsageLogEntity> {
    const log = this.usageLogRepo.create({
      userId: params.userId,
      action: params.action,
      model: params.model,
      threadId: params.threadId,
      inputTokens: params.inputTokens ?? 0,
      outputTokens: params.outputTokens ?? 0,
      tokensUsed: params.tokensUsed ?? 0,
      toolCallsCount: params.toolCallsCount ?? 0,
      costCents: params.costCents ?? 0,
      metadata: params.metadata ?? null,
    });

    this.logger.debug(`Logging usage for user ${params.userId}: ${params.action}`);
    return this.usageLogRepo.save(log);
  }

  async getUsage(userId: string, from?: Date, to?: Date): Promise<UsageLogEntity[]> {
    const where: Record<string, unknown> = { userId };

    if (from && to) {
      where.createdAt = Between(from, to);
    }

    return this.usageLogRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getUsageSummary(
    userId: string,
    from?: Date,
    to?: Date
  ): Promise<{ totalTokens: number; totalCostCents: number; count: number }> {
    const logs = await this.getUsage(userId, from, to);

    return {
      totalTokens: logs.reduce((sum, log) => sum + log.tokensUsed, 0),
      totalCostCents: logs.reduce((sum, log) => sum + log.costCents, 0),
      count: logs.length,
    };
  }
}
