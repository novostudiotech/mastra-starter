import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/**
 * Media module for file uploads via S3-compatible storage.
 *
 * Setup: Run `./scripts/setup-s3.sh` to configure CORS.
 * See docs/file-upload-setup.md for details.
 */
@Module({
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
