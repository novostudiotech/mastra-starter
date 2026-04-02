#!/bin/bash
# Setup S3-compatible storage (DigitalOcean Spaces, AWS S3, MinIO)
# Configures CORS for browser uploads and public read access for media files
# Reads credentials from .env file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🪣 S3 Setup Script"
echo "=================="
echo ""

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  brew install awscli    # macOS"
    echo "  apt install awscli     # Ubuntu/Debian"
    echo "  pip install awscli     # pip"
    echo ""
    exit 1
fi

# Check for .env file
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    echo "Copy .env.example to .env and fill in S3 credentials"
    exit 1
fi

# Load environment variables from .env (S3_PREFIX is intentionally not loaded - policy applies to all prefixes)
export $(grep -E '^(S3_(REGION|ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)|APP_ENV)=' "$ENV_FILE" | xargs)

# Validate required variables
missing_vars=()
[ -z "$S3_BUCKET" ] && missing_vars+=("S3_BUCKET")
[ -z "$S3_ACCESS_KEY" ] && missing_vars+=("S3_ACCESS_KEY")
[ -z "$S3_SECRET_KEY" ] && missing_vars+=("S3_SECRET_KEY")

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required environment variables in .env:${NC}"
    printf '  - %s\n' "${missing_vars[@]}"
    exit 1
fi

# Note: S3_PREFIX is NOT used here - bucket policy applies to ALL prefixes
# This allows the same bucket to be used across environments (local, staging, prod)
echo -e "${YELLOW}Note: Bucket policy will apply to ALL prefixes (local/*, staging/*, prod/*, etc.)${NC}"

# Set default endpoint for AWS S3 if not specified
ENDPOINT_URL=""
if [ -n "$S3_ENDPOINT" ]; then
    ENDPOINT_URL="--endpoint-url $S3_ENDPOINT"
    echo "Endpoint: $S3_ENDPOINT"
else
    echo "Endpoint: AWS S3 (default)"
fi
echo "Bucket:   $S3_BUCKET"
echo ""

# Configure AWS CLI profile
PROFILE_NAME="bailaspot-s3-setup"
REGION="${S3_REGION:-us-east-1}"
aws configure set aws_access_key_id "$S3_ACCESS_KEY" --profile "$PROFILE_NAME"
aws configure set aws_secret_access_key "$S3_SECRET_KEY" --profile "$PROFILE_NAME"
aws configure set region "$REGION" --profile "$PROFILE_NAME"

# ============================================================================
# 1. CORS Configuration (for browser uploads)
# ============================================================================

CORS_CONFIG=$(cat <<'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://bailaspot.com",
        "https://*.bailaspot.com"
      ],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF
)

CORS_FILE=$(mktemp)
echo "$CORS_CONFIG" > "$CORS_FILE"

echo "1/2 Applying CORS configuration..."

if aws s3api put-bucket-cors \
    --bucket "$S3_BUCKET" \
    --cors-configuration "file://$CORS_FILE" \
    $ENDPOINT_URL \
    --profile "$PROFILE_NAME" 2>&1; then
    echo -e "${GREEN}    ✓ CORS configured${NC}"
else
    echo -e "${RED}    ✗ Failed to configure CORS${NC}"
    rm -f "$CORS_FILE"
    exit 1
fi

rm -f "$CORS_FILE"

# ============================================================================
# 2. Bucket Policy (public read for media files)
# ============================================================================

# Public read contexts (all photos should be publicly accessible)
# Matches UploadContext enum in src/media/enums/upload-context.enum.ts
PUBLIC_CONTEXTS=(
    "user-photo"
    "event-photo"
    "organizer-logo"
    "organizer-cover"
    "venue-photo"
)

# Build resource list for policy (using wildcard for prefix to cover all environments)
RESOURCES=""
for ctx in "${PUBLIC_CONTEXTS[@]}"; do
    if [ -n "$RESOURCES" ]; then
        RESOURCES="$RESOURCES,"
    fi
    RESOURCES="$RESOURCES
        \"arn:aws:s3:::${S3_BUCKET}/*/${ctx}/*\""
done

POLICY_CONFIG=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadMedia",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": [$RESOURCES
      ]
    }
  ]
}
EOF
)

POLICY_FILE=$(mktemp)
echo "$POLICY_CONFIG" > "$POLICY_FILE"

echo ""
echo "2/2 Applying bucket policy (public read for media)..."

if aws s3api put-bucket-policy \
    --bucket "$S3_BUCKET" \
    --policy "file://$POLICY_FILE" \
    $ENDPOINT_URL \
    --profile "$PROFILE_NAME" 2>&1; then
    echo -e "${GREEN}    ✓ Bucket policy configured${NC}"
else
    echo -e "${RED}    ✗ Failed to configure bucket policy${NC}"
    echo ""
    echo -e "${YELLOW}Note: DigitalOcean Spaces may not support bucket policies.${NC}"
    echo "Alternative: Set files to public-read ACL during upload."
    rm -f "$POLICY_FILE"
fi

rm -f "$POLICY_FILE"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "CORS allowed origins:"
echo "  - http://localhost:3000"
echo "  - http://localhost:5173"
echo "  - http://localhost:5174"
echo "  - https://bailaspot.com"
echo "  - https://*.bailaspot.com"
echo ""
echo "Public read paths (all prefixes):"
for ctx in "${PUBLIC_CONTEXTS[@]}"; do
    echo "  - */${ctx}/*"
done
echo ""
echo -e "${YELLOW}To modify settings, edit this script and re-run it.${NC}"
