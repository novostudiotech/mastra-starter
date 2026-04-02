import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { ConfigService } from '#/app/config';
import { ErrorCode } from '#/app/dto/error-response.dto';
import { UploadRequestDto, UploadResponseDto } from './dto';
import { UPLOAD_CONTEXT_CONFIG } from './enums';

const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucket: string | undefined;
  private readonly endpoint: string | undefined;
  private readonly cdnUrl: string | undefined;
  private readonly prefix: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get('S3_REGION');
    this.endpoint = this.configService.get('S3_ENDPOINT');
    const accessKey = this.configService.get('S3_ACCESS_KEY');
    const secretKey = this.configService.get('S3_SECRET_KEY');
    this.bucket = this.configService.get('S3_BUCKET');
    this.cdnUrl = this.configService.get('S3_CDN_URL');
    this.prefix =
      this.configService.get('S3_PREFIX') ?? this.configService.get('APP_ENV') ?? 'local';

    if (accessKey && secretKey && this.bucket) {
      this.s3Client = new S3Client({
        region: region ?? 'us-east-1',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });
      this.logger.log(`Media service initialized with S3 (bucket: ${this.bucket})`);
    } else {
      this.s3Client = null;
      this.logger.warn('Media service not configured - S3_* environment variables missing');
    }
  }

  async generateUploadUrl(userId: string, dto: UploadRequestDto): Promise<UploadResponseDto> {
    if (!this.s3Client || !this.bucket) {
      throw new ServiceUnavailableException({
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Media upload service is not configured',
      });
    }

    const config = UPLOAD_CONTEXT_CONFIG[dto.context];

    if (!config.allowedMimeTypes.includes(dto.contentType)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Content type '${dto.contentType}' is not allowed for ${dto.context}. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
      });
    }

    const extension = this.getExtensionFromMimeType(dto.contentType);
    const fileId = uuidv7();
    const key = `${this.prefix}/${dto.context}/${userId}/${fileId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
      ACL: 'public-read',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });

    const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000);
    const fileUrl = this.cdnUrl ? `${this.cdnUrl}/${key}` : this.buildDirectUrl(key);

    return {
      uploadUrl,
      fileUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    return mimeToExt[mimeType] ?? 'bin';
  }

  private buildDirectUrl(key: string): string {
    if (this.endpoint) {
      // Custom endpoint (e.g., DO Spaces, MinIO): https://endpoint/bucket/key
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    // AWS S3: https://bucket.s3.amazonaws.com/key
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  isConfigured(): boolean {
    return this.s3Client !== null;
  }
}
