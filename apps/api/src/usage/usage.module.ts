import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageLogEntity } from './entities/usage-log.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageLogEntity])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
