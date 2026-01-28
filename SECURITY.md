# Security Guidelines

## Environment Variables

### Setup
1. Copy `.env.local.example` to `.env.local`
2. Replace all placeholder values with your actual credentials
3. **NEVER** commit `.env.local` to git

### Required Credentials

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - **HIGHLY SENSITIVE** - Never expose to client

#### WooCommerce
- `WOO_STORE_URL` - Your WooCommerce store URL
- `WOO_CONSUMER_KEY` - WooCommerce REST API consumer key
- `WOO_CONSUMER_SECRET` - **SENSITIVE** - REST API secret
- `WOO_WEBHOOK_SECRET` - **REQUIRED** - Webhook signature verification

### Credential Rotation

If credentials are ever exposed:

1. **Supabase Keys**
   - Go to: https://supabase.com/dashboard/project/_/settings/api
   - Click "Rotate" on compromised keys
   - Update `.env.local` immediately
   - Restart your application

2. **WooCommerce API Keys**
   - Go to: WP Admin > WooCommerce > Settings > Advanced > REST API
   - Revoke compromised keys
   - Generate new keys
   - Update `.env.local` and restart

3. **Webhook Secret**
   - Generate new secret: `openssl rand -base64 32`
   - Update `.env.local`
   - Update webhook configuration in WooCommerce
   - Restart application

## Webhook Security

### WooCommerce Webhook Configuration

The `WOO_WEBHOOK_SECRET` is **REQUIRED** and **NOT OPTIONAL**. This secret is used to verify that webhook requests are actually coming from your WooCommerce store.

**Without this secret, attackers can:**
- Create unauthorized companies
- Create admin accounts
- Modify subscription data
- Trigger fraudulent transactions

### How It Works

1. When WooCommerce sends a webhook, it includes an `X-WC-Webhook-Signature` header
2. The signature is a base64-encoded HMAC hash of the webhook payload
3. Our application verifies the signature using the shared secret
4. If signatures don't match, the webhook is rejected

### Configuration Steps

1. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

2. Add to `.env.local`:
   ```env
   WOO_WEBHOOK_SECRET=your_generated_secret_here
   ```

3. Configure in WooCommerce:
   - Go to: WP Admin > WooCommerce > Settings > Advanced > Webhooks
   - Create/Edit your webhook
   - Set "Secret" field to the same value
   - Save webhook

## API Security

### Rate Limiting
- Webhook endpoints: 100 requests/minute per IP
- Analytics endpoints: 10 requests/minute per user
- Mutation endpoints: 60 requests/minute per user
- Read endpoints: 120 requests/minute per user

### Authentication
- All dashboard routes require authentication
- Admin routes require `role: 'admin'` in user metadata
- API routes use Supabase Auth verification

### Authorization
- Row-Level Security (RLS) enabled on all tables
- Users can only access their company's data
- Admins can access all data
- Service role key bypasses RLS (use carefully)

## Reporting Security Issues

If you discover a security vulnerability:
1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [your-email]
3. Include detailed description and reproduction steps
4. Allow 48 hours for initial response

## Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] All environment variables are set
- [ ] `WOO_WEBHOOK_SECRET` is configured
- [ ] Webhook signature validation is enabled
- [ ] Supabase RLS policies are active
- [ ] Service role key is only used server-side
- [ ] Rate limiting is configured
- [ ] HTTPS is enabled in production
- [ ] Database backups are enabled
- [ ] Error messages don't leak sensitive data
