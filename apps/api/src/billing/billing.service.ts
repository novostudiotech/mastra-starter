import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from './entities/subscription.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>
  ) {}

  async getSubscription(userId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionRepo.findOne({ where: { userId } });
  }

  async subscribe(
    userId: string,
    plan: SubscriptionPlan = SubscriptionPlan.FREE
  ): Promise<SubscriptionEntity> {
    const existing = await this.subscriptionRepo.findOne({ where: { userId } });

    if (existing) {
      existing.plan = plan;
      existing.status = SubscriptionStatus.ACTIVE;
      this.logger.log(`Updated subscription for user ${userId} to plan ${plan}`);
      return this.subscriptionRepo.save(existing);
    }

    const subscription = this.subscriptionRepo.create({
      userId,
      plan,
      status: SubscriptionStatus.ACTIVE,
    });

    this.logger.log(`Created subscription for user ${userId} with plan ${plan}`);
    return this.subscriptionRepo.save(subscription);
  }

  async cancelSubscription(userId: string): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepo.findOne({ where: { userId } });

    if (!subscription) {
      throw new NotFoundException(`Subscription not found for user ${userId}`);
    }

    subscription.status = SubscriptionStatus.CANCELED;
    this.logger.log(`Canceled subscription for user ${userId}`);
    return this.subscriptionRepo.save(subscription);
  }
}
