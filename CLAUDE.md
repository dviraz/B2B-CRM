# AgencyOS - Project Context

## Overview
AgencyOS is a client portal and agency fulfillment system following the "DesignJoy" productized service model.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Shadcn UI
- **Backend/DB:** Supabase (PostgreSQL, Auth, Realtime)
- **Billing:** WooCommerce (WordPress) via webhooks

## Architecture Principles
- Async-first communication (no live chat)
- Queue-based constraint system (limited active requests per plan)
- Webhook-driven subscription sync with WooCommerce
- Row-Level Security (RLS) for multi-tenant isolation

## Key Directories
```
/app                    # Next.js 15 App Router pages
  /api                  # API routes (webhooks, request actions)
  /(auth)               # Auth pages (login, set-password)
  /(dashboard)          # Protected dashboard routes
    /admin              # Admin-only views
    /client             # Client views
/components             # React components
  /ui                   # Shadcn UI primitives
  /kanban               # Kanban board components
/lib                    # Utilities
  /supabase             # Supabase client & helpers
  /woocommerce          # WooCommerce API integration
/types                  # TypeScript types
```

## Database Tables
- `companies` - Client organizations with plan limits
- `requests` - Work items (queue, active, review, done)
- `comments` - Async communication on requests
- `profiles` - User profiles linked to auth.users

## Key Constraints
- Clients CANNOT move requests to "Active" - only Admins
- Active request count limited by plan_tier (standard=1, pro=2)
- Churned clients get read-only or disabled access

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WOO_CONSUMER_KEY=
WOO_CONSUMER_SECRET=
WOO_WEBHOOK_SECRET=
WOO_STORE_URL=
```

## Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests
```
