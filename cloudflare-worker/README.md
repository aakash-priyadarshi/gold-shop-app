# Cloudflare R2 + Worker Image Upload Setup

This guide explains how to set up the Cloudflare R2 + Worker solution for image uploads.

## Overview

The image upload system uses:

- **Cloudflare R2**: Object storage for images (free egress, cheap storage)
- **Cloudflare Worker**: Handles uploads, validates files, and serves images
- **Client-side optimization**: Images are resized/compressed before upload for faster transfers

## Architecture

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────┐
│   Browser    │────▶│  Cloudflare Worker │────▶│  R2 Bucket  │
│              │     │  (images.orivraa.com)    │  │             │
│ - Compress   │     │  - Validate        │     │ - Store     │
│ - Convert    │     │  - Generate key    │     │ - Serve CDN │
│ - Upload     │     │  - Store to R2     │     │             │
└──────────────┘     └────────────────────┘     └─────────────┘
```

## Setup Steps

### 1. Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** → **Create bucket**
3. Name: `orivraa-images`
4. Location: Choose closest to your users (e.g., `apac` for Asia)

### 2. Enable Public Access for R2 (Optional but Recommended)

For direct image serving without going through the worker:

1. Go to your R2 bucket settings
2. Enable **Public access**
3. Set up a custom domain: `images.orivraa.com`
   - Add CNAME record: `images` → `<your-r2-public-url>`

### 3. Deploy the Cloudflare Worker

```bash
cd cloudflare-worker

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Deploy to production
npm run deploy:prod
```

### 4. Configure Worker Routes

1. Go to **Workers & Pages** → **orivraa-images**
2. Add a custom domain: `images.orivraa.com` (or use the workers.dev subdomain)
3. Configure environment variables:
   - `ALLOWED_ORIGINS`: `https://orivraa.com,https://www.orivraa.com,http://localhost:3000`
4. Configure the shared authorization secret (the API uses the same value):

```bash
npx wrangler secret put IMAGE_WORKER_AUTH_SECRET --env production
```

The API exposes `GET /api/auth/image-upload-token` to authenticated users. It
returns a five-minute HMAC token scoped to `upload` or `delete`; the browser
passes that token to the worker. Configure the same 32+ character secret as
`IMAGE_WORKER_AUTH_SECRET` on Railway for the API. It must never be a
`NEXT_PUBLIC_*` variable.

### 5. Update Environment Variables

Add to your web app's `.env`:

```env
NEXT_PUBLIC_IMAGE_WORKER_URL=https://images.orivraa.com
```

## Image Upload Types

The system supports three upload types with different sizing:

| Type      | Max Size    | Use Case                      |
| --------- | ----------- | ----------------------------- |
| `product` | 1200×1200px | Product images for inventory  |
| `profile` | 400×400px   | User profile pictures         |
| `rfq`     | 1200×1200px | Custom order reference images |

## API Endpoints

### Upload Image

```
POST /upload
Headers:
  - Content-Type: multipart/form-data
  - X-Upload-Type: product | profile | rfq
  - Authorization: Bearer <short-lived token from the API>

Body: FormData with 'file' field

Response:
{
  "success": true,
  "url": "https://images.orivraa.com/product/1234567890-abc123.webp",
  "key": "product/1234567890-abc123.webp",
  "urls": {
    "original": "...",
    "large": "...",
    "medium": "...?w=600",
    "thumbnail": "...?w=200"
  }
}
```

### Delete Image

```
DELETE /delete/{key}
Headers:
  - Authorization: Bearer <short-lived token from the API>

Response:
{
  "success": true
}
```

### Health Check

```
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-01-14T..."
}
```

## Client-Side Usage

### Using the Hook (Recommended)

```tsx
import { useImageUpload } from "@/hooks/useImageUpload";

function MyComponent() {
  const { uploading, progress, upload, error } = useImageUpload({
    type: "product",
    onSuccess: (result) => {
      console.log("Uploaded:", result.url);
    },
    onError: (error) => {
      console.error("Failed:", error);
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await upload(file);
      // Handle result
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} disabled={uploading} />
      {uploading && <p>Uploading: {progress}%</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### Direct API Usage

```tsx
import { uploadImage, getImageUrl } from "@/lib/image-upload";

// Upload
const result = await uploadImage(file, { type: "product" });
if (result.success) {
  const url = result.url;
}

// Get URL with variant
const thumbnailUrl = getImageUrl(imageKey, "thumbnail");
```

## Image Processing

Images are processed client-side before upload:

- Resized to max dimensions based on type
- Converted to WebP format (with JPEG fallback)
- Quality: 90% for large images

This reduces upload time and storage costs while maintaining quality.

## Costs

### Cloudflare R2 Pricing (as of 2026)

- Storage: $0.015/GB-month
- Class A operations (writes): $4.50/million
- Class B operations (reads): $0.36/million
- **Egress: FREE** ← Major benefit

### Cloudflare Workers (Free Tier)

- 100,000 requests/day
- 10ms CPU time/invocation

For a typical jewelry shop:

- 1000 products × 5 images × 500KB avg = ~2.5GB storage = ~$0.04/month
- Even with 100K daily views, egress is FREE

## Security

1. **Authorization**: Uploads and deletes require a short-lived API-issued HMAC token. Upload tokens are scoped to the upload type; delete tokens are checked against the object's owner metadata (or an admin role).
2. **File validation**: The worker checks magic bytes, requires the detected type to match the claimed MIME, and enforces a 10MB image/video or 5MB document limit. JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, PDF, DOC, and DOCX are supported where the upload type permits them; SVG is rejected.
3. **Unique keys**: Keys are generated server-side from an allowlisted upload type, timestamp, and cryptographically random UUID. Client filenames never control the object path.
4. **CORS**: Allowed origins remain restricted, but CORS is not used as authorization.

## Troubleshooting

### "Module not found" in Worker

Make sure you're deploying with wrangler, not importing express directly.

### CORS Errors

Check that your domain is in the `ALLOWED_ORIGINS` environment variable.

### Large Files Failing

- Client-side compression should handle most cases
- Max upload is 10MB (configurable in worker)

### Images Not Loading

1. Check R2 bucket permissions
2. Verify custom domain DNS is configured
3. Check worker logs in Cloudflare dashboard
