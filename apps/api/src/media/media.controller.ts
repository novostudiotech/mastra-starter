import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptionalAuth, Session, UserSession } from '@thallesp/nestjs-better-auth';
import { UploadRequestDto, UploadResponseDto } from './dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
@OptionalAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate a presigned URL for file upload' })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid content type for context' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 503, description: 'Media upload service not configured' })
  async generateUploadUrl(
    @Session() session: UserSession | null,
    @Body() dto: UploadRequestDto
  ): Promise<UploadResponseDto> {
    if (!session?.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.mediaService.generateUploadUrl(session.user.id, dto);
  }
}
