import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const uploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

export class UploadResponseDto extends createZodDto(uploadResponseSchema) {}
