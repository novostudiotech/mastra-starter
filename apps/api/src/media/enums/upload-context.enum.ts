export enum UploadContext {
  USER_PHOTO = 'user-photo',
  EVENT_PHOTO = 'event-photo',
  ORGANIZER_LOGO = 'organizer-logo',
  ORGANIZER_COVER = 'organizer-cover',
  VENUE_PHOTO = 'venue-photo',
}

export const UPLOAD_CONTEXT_CONFIG: Record<
  UploadContext,
  {
    maxSizeBytes: number;
    allowedMimeTypes: string[];
  }
> = {
  [UploadContext.USER_PHOTO]: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadContext.EVENT_PHOTO]: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadContext.ORGANIZER_LOGO]: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  },
  [UploadContext.ORGANIZER_COVER]: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  [UploadContext.VENUE_PHOTO]: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};
