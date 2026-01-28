# Rate Limiting Implementation

## Overview

Rate limiting has been implemented to protect API endpoints from abuse, DoS attacks, and excessive usage.

## Current Implementation

The system uses **in-memory rate limiting** suitable for:
- Development environments
- Single-instance deployments
- Small to medium traffic volumes

### Limitations of In-Memory Rate Limiting

⚠️ **Important:** In-memory rate limiting:
- Resets on server restart
- Doesn't work across multiple instances/containers
- Not suitable for production with load balancing

## Rate Limit Tiers

### Webhook Endpoints
- **Limit:** 100 requests per minute per IP
- **Endpoints:** `/api/webhooks/*`
- **Purpose:** Prevent webhook flooding

### Analytics Endpoints
- **Limit:** 10 requests per minute per user
- **Endpoints:** `/api/analytics/*`
- **Purpose:** Protect expensive database queries

### Mutation Endpoints
- **Limit:** 60 requests per minute per user
- **Endpoints:** POST/PUT/DELETE operations
- **Purpose:** Prevent rapid data modifications

### Read Endpoints
- **Limit:** 120 requests per minute per user
- **Endpoints:** GET operations
- **Purpose:** Basic DoS protection

### Strict (Expensive Operations)
- **Limit:** 5 requests per minute per user
- **Endpoints:** `/api/sync/*`, other resource-intensive operations
- **Purpose:** Protect against expensive operations

## Usage

### In API Routes

```typescript
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  // Your route logic here...
}
```

### Custom Rate Limits

```typescript
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, {
    limit: 30,           // 30 requests
    window: 60 * 1000,   // per minute
  });
  if (rateLimitResult) return rateLimitResult;

  // Your route logic here...
}
```

### User-Based Rate Limiting

```typescript
import { applyRateLimit, userIdentifier } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, {
    limit: 60,
    window: 60 * 1000,
    identifier: userIdentifier, // Rate limit by user ID instead of IP
  });
  if (rateLimitResult) return rateLimitResult;

  // Your route logic here...
}
```

## Response Headers

All rate-limited responses include these headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2026-01-20T10:30:00.000Z
```

When rate limit is exceeded:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-01-20T10:30:00.000Z

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 30
}
```

## Upgrading to Redis for Production

For production deployments with multiple instances, upgrade to Redis-based rate limiting:

### 1. Install Upstash Rate Limit

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 2. Create Upstash Redis Instance

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and Token

### 3. Add Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 4. Update Rate Limit Implementation

Replace `src/lib/rate-limit.ts` with:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = Redis.fromEnv();

export const RateLimitPresets = {
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),

  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
  }),

  // ... other presets
};

export async function applyRateLimit(
  req: NextRequest,
  ratelimit: Ratelimit
): Promise<NextResponse | null> {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        },
      }
    );
  }

  return null;
}
```

## Protected Endpoints

The following endpoints currently have rate limiting:

- ✅ `/api/webhooks/woo` - Webhook (100/min per IP)
- ✅ `/api/sync/woocommerce` - Strict (5/min per user)
- ✅ `/api/requests/bulk` - Mutation (60/min per user)

### Endpoints That Need Rate Limiting

Add rate limiting to these endpoints:

- [ ] `/api/analytics/*` - Analytics preset
- [ ] `/api/requests` (GET) - Read preset
- [ ] `/api/requests` (POST) - Mutation preset
- [ ] `/api/requests/[id]` (PUT/DELETE) - Mutation preset
- [ ] `/api/comments` - Mutation preset
- [ ] `/api/companies` - Read/Mutation presets
- [ ] All other API routes

## Monitoring

### View Rate Limit Logs

In development, rate limit violations are logged to console:

```
Rate limit exceeded for IP: 192.168.1.1
Endpoint: /api/sync/woocommerce
Limit: 5 requests per 60000ms
```

### Production Monitoring

With Upstash:
1. Go to Upstash Console
2. Select your database
3. View Analytics tab for rate limit metrics

## Testing Rate Limits

```bash
# Test rate limiting with curl
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/sync/woocommerce \
    -H "Authorization: Bearer YOUR_TOKEN"
  echo "Request $i"
done
```

After 5 requests, you should receive a 429 response.

## Best Practices

1. **Apply rate limiting to ALL public API routes**
2. **Use stricter limits for expensive operations**
3. **Use user-based limiting when possible** (more accurate than IP)
4. **Log rate limit violations** for security monitoring
5. **Upgrade to Redis** before going to production with multiple instances
6. **Monitor rate limit metrics** to adjust limits based on usage patterns

## Troubleshooting

### Rate limits too strict
Adjust the limits in `src/lib/rate-limit.ts`:

```typescript
export const RateLimitPresets = {
  mutation: {
    limit: 100, // Increase from 60
    window: 60 * 1000,
  },
};
```

### Rate limits not working
1. Check that `applyRateLimit` is called BEFORE other logic
2. Verify the function returns early if rate limit is hit
3. Check server logs for rate limit messages

### Users behind same IP getting limited together
Use user-based rate limiting instead of IP-based:

```typescript
import { userIdentifier } from '@/lib/rate-limit';

const rateLimitResult = await applyRateLimit(request, {
  ...RateLimitPresets.mutation,
  identifier: userIdentifier,
});
```
