import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '#/app/config/config.service';
import { UploadRequestDto } from './dto';
import { UploadContext } from './enums';
import { MediaService } from './media.service';

// Mock AppConfigModule to prevent environment validation in unit tests
jest.mock('#/app/config/config.module', () => ({
  AppConfigModule: class MockAppConfigModule {},
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://test-presigned-url.com'),
}));

describe('MediaService', () => {
  let service: MediaService;

  const mockConfigValues: Record<string, string | undefined> = {
    APP_ENV: 'test',
    S3_REGION: 'fra1',
    S3_ENDPOINT: 'https://fra1.digitaloceanspaces.com',
    S3_BUCKET: 'test-bucket',
    S3_ACCESS_KEY: 'test-access-key',
    S3_SECRET_KEY: 'test-secret-key',
    S3_CDN_URL: 'https://cdn.test.com',
  };

  const createService = async (configOverrides: Record<string, string | undefined> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => ({ ...mockConfigValues, ...configOverrides })[key]),
          },
        },
      ],
    }).compile();

    return {
      service: module.get<MediaService>(MediaService),
      configService: module.get<ConfigService>(ConfigService),
    };
  };

  beforeEach(async () => {
    const result = await createService();
    service = result.service;
  });

  describe('isConfigured', () => {
    it('should return true when all S3_* vars are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when bucket is missing', async () => {
      const { service } = await createService({ S3_BUCKET: undefined });
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when access key is missing', async () => {
      const { service } = await createService({ S3_ACCESS_KEY: undefined });
      expect(service.isConfigured()).toBe(false);
    });

    it('should return false when secret key is missing', async () => {
      const { service } = await createService({ S3_SECRET_KEY: undefined });
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('generateUploadUrl', () => {
    const userId = 'user-123';
    const validDto: UploadRequestDto = {
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
      context: UploadContext.USER_PHOTO,
    };

    it('should generate upload URL for valid request', async () => {
      const result = await service.generateUploadUrl(userId, validDto);

      expect(result).toHaveProperty('uploadUrl', 'https://test-presigned-url.com');
      expect(result).toHaveProperty('fileUrl');
      expect(result.fileUrl).toMatch(
        /^https:\/\/cdn\.test\.com\/test\/user-photo\/user-123\/[a-f0-9-]+\.jpg$/
      );
      expect(result).toHaveProperty('expiresAt');
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw ServiceUnavailableException when not configured', async () => {
      const { service } = await createService({ S3_BUCKET: undefined });

      await expect(service.generateUploadUrl(userId, validDto)).rejects.toThrow(
        ServiceUnavailableException
      );
    });

    it('should throw BadRequestException for invalid content type', async () => {
      const invalidDto: UploadRequestDto = {
        ...validDto,
        contentType: 'application/pdf',
      };

      await expect(service.generateUploadUrl(userId, invalidDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow SVG only for organizer-logo context', async () => {
      const svgDto: UploadRequestDto = {
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
        context: UploadContext.ORGANIZER_LOGO,
      };

      const result = await service.generateUploadUrl(userId, svgDto);
      expect(result.fileUrl).toMatch(/\.svg$/);
    });

    it('should reject SVG for user-photo context', async () => {
      const svgDto: UploadRequestDto = {
        filename: 'photo.svg',
        contentType: 'image/svg+xml',
        context: UploadContext.USER_PHOTO,
      };

      await expect(service.generateUploadUrl(userId, svgDto)).rejects.toThrow(BadRequestException);
    });

    it('should use correct file extension for different mime types', async () => {
      const mimeTests = [
        { contentType: 'image/jpeg', ext: 'jpg' },
        { contentType: 'image/png', ext: 'png' },
        { contentType: 'image/webp', ext: 'webp' },
      ];

      for (const { contentType, ext } of mimeTests) {
        const dto: UploadRequestDto = {
          filename: 'test.file',
          contentType,
          context: UploadContext.EVENT_PHOTO,
        };
        const result = await service.generateUploadUrl(userId, dto);
        expect(result.fileUrl).toMatch(new RegExp(`\\.${ext}$`));
      }
    });

    it('should use CDN URL when configured', async () => {
      const result = await service.generateUploadUrl(userId, validDto);
      expect(result.fileUrl).toMatch(/^https:\/\/cdn\.test\.com\//);
    });

    it('should fallback to direct S3 URL when CDN not configured', async () => {
      const { service } = await createService({ S3_CDN_URL: undefined });
      const result = await service.generateUploadUrl(userId, validDto);
      expect(result.fileUrl).toMatch(
        /^https:\/\/fra1\.digitaloceanspaces\.com\/test-bucket\/test\//
      );
    });

    it('should use AWS S3 URL format when no endpoint configured', async () => {
      const { service } = await createService({ S3_ENDPOINT: undefined, S3_CDN_URL: undefined });
      const result = await service.generateUploadUrl(userId, validDto);
      expect(result.fileUrl).toMatch(/^https:\/\/test-bucket\.s3\.amazonaws\.com\/test\//);
    });

    it('should use custom S3_PREFIX when provided', async () => {
      const { service } = await createService({ S3_PREFIX: 'custom-prefix' });
      const result = await service.generateUploadUrl(userId, validDto);
      expect(result.fileUrl).toMatch(/^https:\/\/cdn\.test\.com\/custom-prefix\//);
    });

    it('should fallback to APP_ENV when S3_PREFIX not set', async () => {
      const { service } = await createService({ APP_ENV: 'prod' });
      const result = await service.generateUploadUrl(userId, validDto);
      expect(result.fileUrl).toMatch(/^https:\/\/cdn\.test\.com\/prod\//);
    });
  });
});
