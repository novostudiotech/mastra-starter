import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { BillingService } from './billing.service';
import { SubscriptionPlan } from './entities/subscription.entity';

@ApiTags('Billing')
@Controller('billing')
@OptionalAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getSubscription(@Session() session: UserSession | null) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.billingService.getSubscription(session.user.id);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Create or update subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created or updated' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async subscribe(
    @Session() session: UserSession | null,
    @Body() body: { plan?: SubscriptionPlan }
  ) {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.billingService.subscribe(session.user.id, body.plan);
  }
}
