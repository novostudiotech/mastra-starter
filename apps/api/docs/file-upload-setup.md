# File Upload Setup (DigitalOcean Spaces)

This guide covers setting up S3-compatible storage for file uploads.

## TL;DR

```bash
# 1. Install AWS CLI (if not installed)
brew install awscli

# 2. Run setup script (reads credentials from .env)
./scripts/setup-s3.sh
```

The script configures:
- **CORS** — allows browser uploads via presigned URLs
- **Bucket policy** — makes uploaded media publicly readable

---

## Environment Variables

Add these to your `.env`:

```bash
S3_ENDPOINT=https://fra1.digitaloceanspaces.com
S3_BUCKET=bailaspot
S3_ACCESS_KEY=<your-access-key>
S3_SECRET_KEY=<your-secret-key>
# Optional: CDN URL for serving files
# S3_CDN_URL=https://cdn.example.com
```

## What the Script Does

### 1. CORS Configuration

Allows browser uploads from these origins:
- `http://localhost:3000`, `http://localhost:5173`, `http://localhost:5174`
- `https://bailaspot.com`, `https://*.bailaspot.com`

### 2. Bucket Policy (Public Read)

Makes these paths publicly readable (no authentication required):
- `{prefix}/user-photo/*`
- `{prefix}/event-photo/*`
- `{prefix}/organizer-logo/*`
- `{prefix}/organizer-cover/*`
- `{prefix}/venue-photo/*`

The `{prefix}` is determined by `S3_PREFIX` or `APP_ENV` (defaults to `local`).

## Frontend Upload

Use minimal headers when uploading via presigned URL:

```typescript
const response = await api.requestUploadUrl({
  context: 'user-photo',
  contentType: file.type,
});

await fetch(response.uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});

// response.fileUrl contains the permanent public URL
```

Do NOT add `Authorization` or custom headers — they're already in the signed URL.

## Manual Setup (without script)

If you need to configure manually:

### Install AWS CLI

```bash
brew install awscli        # macOS
apt install awscli         # Ubuntu/Debian
pip install awscli         # pip
```

### Configure Profile

```bash
aws configure set aws_access_key_id <your-access-key> --profile spaces
aws configure set aws_secret_access_key <your-secret-key> --profile spaces
aws configure set region fra1 --profile spaces
```

### Apply CORS

```bash
cat > /tmp/cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://bailaspot.com"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket bailaspot \
  --cors-configuration file:///tmp/cors.json \
  --endpoint-url https://fra1.digitaloceanspaces.com \
  --profile spaces
```

### Apply Bucket Policy

```bash
cat > /tmp/policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadMedia",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::bailaspot/local/user-photo/*"]
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket bailaspot \
  --policy file:///tmp/policy.json \
  --endpoint-url https://fra1.digitaloceanspaces.com \
  --profile spaces
```

## Troubleshooting

### CORS Error on Upload

1. Check browser DevTools → Network → find the `OPTIONS` request
2. If no `Access-Control-Allow-Origin` header, CORS is not configured
3. Re-run `./scripts/setup-s3.sh`

### AccessDenied on File URL

1. Check that bucket policy is applied: `aws s3api get-bucket-policy --bucket bailaspot --endpoint-url https://fra1.digitaloceanspaces.com --profile spaces`
2. Verify the file path matches the policy (correct prefix)
3. Re-run `./scripts/setup-s3.sh`

### Adding New Origins

Edit `scripts/setup-s3.sh`, update `AllowedOrigins` array, and re-run.
