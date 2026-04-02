import axios from 'axios';
import { expect, test } from './fixtures';

// Skipped: requires S3 credentials in .env.test.local
test.describe
  .skip('Media Upload', () => {
    test('should generate presigned upload URL for authenticated user', async ({
      useAuthenticatedApi,
    }) => {
      const { api } = await useAuthenticatedApi();

      const { status, data } = await api.mediaControllerGenerateUploadUrl({
        filename: 'test-photo.jpg',
        contentType: 'image/jpeg',
        context: 'user-photo',
      });

      expect(status).toBe(201);
      expect(data.uploadUrl).toMatch(/^https:\/\/.+/);
      expect(data.fileUrl).toMatch(/^https:\/\/.+\/user-photo\/.+\.jpg$/);
      expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    test('should upload file using presigned URL', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      // Get presigned URL
      const { data } = await api.mediaControllerGenerateUploadUrl({
        filename: 'test-image.png',
        contentType: 'image/png',
        context: 'user-photo',
      });

      // Create a minimal 1x1 PNG (68 bytes)
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      // Upload to S3 using presigned URL
      const uploadResponse = await axios.put(data.uploadUrl, pngBuffer, {
        headers: {
          'Content-Type': 'image/png',
        },
      });

      expect(uploadResponse.status).toBe(200);
      expect(data.fileUrl).toMatch(/\.png$/);
    });

    test('should reject unauthenticated requests', async ({ useApi }) => {
      const api = await useApi();

      const { status } = await api.mediaControllerGenerateUploadUrl({
        filename: 'test.jpg',
        contentType: 'image/jpeg',
        context: 'user-photo',
      });

      expect(status).toBe(401);
    });

    test('should reject invalid content type', async ({ useAuthenticatedApi }) => {
      const { api } = await useAuthenticatedApi();

      const { status } = await api.mediaControllerGenerateUploadUrl({
        filename: 'doc.pdf',
        contentType: 'application/pdf',
        context: 'user-photo',
      });

      expect(status).toBe(400);
    });
  });
