# AgencyOS B2B-CRM - Comprehensive Issues & Gaps Report

**Generated:** 2026-01-20
**Codebase:** B2B-CRM (Next.js 15 + Supabase)
**Purpose:** Complete audit of security, features, configuration, and code quality

---

## 🔴 CRITICAL SECURITY ISSUES (Fix Immediately)

### 1. HARDCODED CREDENTIALS IN GIT REPOSITORY
**Severity:** CRITICAL ⚠️
**File:** `.env.local` (committed to repository)

**Problem:**
- All API keys and secrets committed to git history
- Includes Supabase service role key (highly privileged)
- WooCommerce API credentials exposed
- Anyone with repo access can see all secrets

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WOO_CONSUMER_KEY=ck_266157f6503378c4090092369a91bb285974734d
WOO_CONSUMER_SECRET=cs_3146972e0966bb7110c82641c9f2590eed79a172
```

**Fix Required:**
1. Add `.env.local` to `.gitignore`
2. Remove from git history: `git filter-branch --index-filter 'git rm --cached --ignore-unmatch .env.local' HEAD`
3. Rotate ALL credentials immediately (Supabase anon key, service role key, WooCommerce keys)
4. Use `.env.local.example` pattern with placeholder values
5. Document environment setup in README

---

### 2. WEBHOOK SIGNATURE VALIDATION IS OPTIONAL
**Severity:** CRITICAL ⚠️
**File:** `src/app/api/webhooks/woo/route.ts` (lines 85-96)

**Problem:**
```typescript
if (webhookSecret && signature) {
  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }
}
// If webhookSecret is empty, validation is SKIPPED!
```

**Attack Vector:**
- If `WOO_WEBHOOK_SECRET` is not set, NO validation happens
- Attacker can forge webhooks to:
  - Create unauthorized companies
  - Create admin accounts
  - Modify subscription data
  - Trigger user account creation

**Fix Required:**
```typescript
if (!webhookSecret) {
  return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
}
if (!signature) {
  return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
}
const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

---

### 3. NO RATE LIMITING ON ANY ENDPOINT
**Severity:** HIGH
**Files:** All 29 API routes in `src/app/api/`

**Problem:**
- No rate limiting middleware exists
- All endpoints accept unlimited requests
- Vulnerable to:
  - Brute force attacks
  - DoS attacks
  - Credential stuffing
  - API abuse
  - Webhook flooding

**Vulnerable Endpoints:**
- `/api/webhooks/woo` - Can be flooded to create duplicate records
- `/api/analytics` - Expensive queries can be spammed
- `/api/sync/woocommerce` - Resource-intensive sync can be triggered repeatedly
- All POST/PUT/DELETE endpoints

**Fix Required:**
- Implement rate limiting middleware (e.g., `@upstash/ratelimit`, `express-rate-limit`)
- Apply different limits per endpoint type:
  - Webhooks: 100/minute per IP
  - Analytics: 10/minute per user
  - Mutations: 60/minute per user
  - Reads: 120/minute per user

---

### 4. MISSING AUTHORIZATION CHECKS
**Severity:** HIGH
**Files:** Multiple API routes

**Problem 1: Request ID Authorization**
`src/app/api/requests/[id]/route.ts` (lines 6-34)
```typescript
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  // No validation that user can access this request_id
  const { data } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single();
  return NextResponse.json(data);
}
```

**Issue:** Relies entirely on Supabase RLS. If RLS is misconfigured, data leakage occurs.

**Problem 2: Admin Endpoints Inconsistency**
`src/app/api/team-members/route.ts` returns all admin emails without role check
`src/app/api/companies/route.ts` checks admin role properly

**Fix Required:**
- Add explicit authorization checks before all sensitive operations
- Don't rely solely on RLS
- Implement consistent admin middleware

---

### 5. INSUFFICIENT INPUT VALIDATION
**Severity:** MEDIUM-HIGH
**Files:** All API routes accepting user input

**Examples:**

**Search Query - No Length Limits**
`src/app/api/requests/route.ts` (line 79)
```typescript
if (searchQuery) {
  query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
}
// searchQuery can be 1GB string causing DoS
```

**Bulk Operations - No Array Size Limit**
`src/app/api/requests/bulk/route.ts` (line 26)
```typescript
const { request_ids, action, value } = body;
if (!request_ids || !Array.isArray(request_ids)) {
  return NextResponse.json({ error: 'Invalid request_ids' }, { status: 400 });
}
// request_ids can be array of 100,000 items
```

**Fix Required:**
- Add maximum string length validation (e.g., 1000 chars for search)
- Limit array sizes (e.g., max 100 items in bulk operations)
- Validate all URL parameters
- Add schema validation library (Zod)

---

## 🟠 HIGH PRIORITY INFRASTRUCTURE ISSUES

### 6. EMPTY PRODUCT-TO-PLAN MAPPING
**Severity:** HIGH
**File:** `src/lib/woocommerce/client.ts` (lines 200-205)

**Problem:**
```typescript
const PRODUCT_PLAN_MAP: Record<number, 'standard' | 'pro'> = {
  // 12345: 'standard',
  // 67890: 'pro',
};
```

**Impact:**
- ALL new subscriptions default to "standard" plan
- No way to assign "pro" plan from WooCommerce
- Revenue-limiting bug (can't sell pro tier)
- Breaks entire subscription sync logic

**Fix Required:**
1. Map actual WooCommerce product IDs to plan tiers
2. Add validation: if unmapped product, log error and notify admin
3. Document product IDs in configuration

---

### 7. N+1 QUERY PERFORMANCE ISSUES
**Severity:** HIGH
**Files:** `src/app/api/webhooks/woo/route.ts`, `src/app/api/sync/woocommerce/route.ts`

**Problem:**
```typescript
// In WooCommerce sync (line 222-228)
for (const item of subscription.line_items) {
  const { data: existingService } = await adminSupabase
    .from('client_services')
    .select('id')
    .eq('company_id', company.id)
    .eq('woo_subscription_id', subscription.id.toString())
    .single();
  // Queries database ONCE PER LINE ITEM
}
```

**Impact:**
- 100 subscriptions with 5 items each = 500 database queries
- Slow sync performance
- Database connection pool exhaustion

**Fix Required:**
- Fetch all existing services in ONE query
- Use in-memory map for lookups
- Batch insert new services

---

### 8. INCOMPLETE ERROR HANDLING & ROLLBACK
**Severity:** MEDIUM-HIGH
**File:** `src/app/api/webhooks/woo/route.ts`

**Problem 1: No Transaction Support**
Lines 211-249
```typescript
// Create company
const { data: newCompany } = await supabase.from('companies').insert({...}).single();

// Create auth user
const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({...});

if (authError) {
  // Manual rollback - might fail!
  await supabase.from('companies').delete().eq('id', newCompany.id);
}
```

**Issues:**
- No atomic transactions
- If process crashes between operations, orphaned records remain
- Manual rollback can fail, leaving inconsistent state

**Problem 2: Silent Failures**
Line 175: Service creation has no error handling
Line 273-275: Password reset email errors logged but user never notified

**Fix Required:**
- Use Supabase transactions or implement saga pattern
- Add comprehensive error handling for all operations
- Notify users of failures (email, notifications)

---

### 9. MISSING DATABASE INDEXES
**Severity:** MEDIUM
**Database:** Supabase PostgreSQL

**Missing Indexes:**
- `requests.assigned_to` - queried in workload analytics
- `requests.company_id, requests.status` - composite for filtering
- `comments.user_id` - for user's comment history
- `client_services.company_id` - for company services lookup
- Partial index on `requests(status) WHERE status = 'active'`

**Impact:**
- Slow queries as data grows
- Full table scans
- Poor dashboard performance

**Fix Required:**
Create migration with:
```sql
CREATE INDEX idx_requests_assigned_to ON requests(assigned_to);
CREATE INDEX idx_requests_company_status ON requests(company_id, status);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_active_requests ON requests(status) WHERE status = 'active';
```

---

## 🟡 MISSING/INCOMPLETE FEATURES

### 10. WooCommerce Configuration Gaps
**Status:** Partially Implemented

**Missing:**
- ❌ Webhook secret not set in `.env.local`
- ❌ Store URL empty
- ❌ No UI for managing WooCommerce connection
- ❌ No webhook health check endpoint
- ❌ No manual sync button in admin UI
- ✅ Webhook handler exists
- ✅ Sync endpoint exists

**Fix Required:**
1. Configure WooCommerce webhook URL in WP admin
2. Add webhook management UI in settings
3. Add "Test Connection" button
4. Add webhook logs viewer

---

### 11. File Upload System Incomplete
**Status:** Partially Implemented

**Implemented:**
- ✅ File upload components (`file-dropzone.tsx`, `file-list.tsx`)
- ✅ Database table `files` with storage fields
- ✅ API route `/api/requests/[id]/files`

**Missing:**
- ❌ Supabase Storage bucket configuration
- ❌ No file size limits
- ❌ No file type validation
- ❌ No virus scanning
- ❌ No thumbnail generation for images
- ❌ Storage quota management

**Fix Required:**
1. Create Supabase Storage bucket: `request-files`
2. Configure bucket RLS policies
3. Implement file upload handler with validation
4. Add file size limits (e.g., 50MB max)
5. Add allowed file types whitelist

---

### 12. Email Service Not Implemented
**Status:** Not Implemented

**References Found:**
- Webhook handler tries to send password reset emails
- Notification preferences include email toggles
- No actual email delivery configured

**Missing:**
- ❌ No SMTP/SendGrid/Resend configuration
- ❌ No email templates
- ❌ No email queue system
- ❌ No email delivery logs

**Fix Required:**
1. Choose email provider (Resend recommended for Next.js)
2. Add email templates for:
   - Password reset
   - New request notifications
   - Status change notifications
   - Comment notifications
3. Implement email sending service
4. Add email delivery logs

---

### 13. Settings Page Minimal
**Status:** Incomplete
**File:** `src/app/(dashboard)/dashboard/settings/page.tsx`

**Currently Shows:**
- ✅ Notification preferences only

**Missing:**
- ❌ Account settings (name, email, avatar)
- ❌ Password change form
- ❌ Two-factor authentication
- ❌ API keys management
- ❌ Webhook settings (for admin)
- ❌ Team management (add/remove users)
- ❌ Company branding (logo, colors)

**Fix Required:**
Expand settings page with tabs:
- Profile
- Security
- Notifications
- Team (admin only)
- Integrations (admin only)

---

### 14. Admin Features Missing UI

**Team Member Management**
- ✅ API: `/api/team-members`
- ❌ No UI for adding/removing admins
- ❌ No role management interface

**Webhook Management**
- ✅ Database: `webhooks` table defined
- ❌ No UI for creating webhooks
- ❌ No webhook logs viewer

**Audit Log Filtering**
- ✅ Audit log viewer exists
- ❌ No filtering by action type
- ❌ No filtering by entity
- ❌ No export functionality
- ❌ No date range picker

**Fix Required:**
Create admin pages:
- `/dashboard/admin/team` - Team management
- `/dashboard/admin/webhooks` - Webhook configuration
- Enhance audit log viewer with filters

---

### 15. Client Dashboard Limitations

**Current Client View:**
- ✅ Can see their requests
- ✅ Can create new requests
- ✅ Can add comments

**Missing:**
- ❌ Can't see their subscription status
- ❌ Can't see their MRR or billing info
- ❌ Can't see renewal dates
- ❌ Can't pause/resume subscription
- ❌ No usage analytics (requests this month, etc.)
- ❌ No invoices/receipts view

**Fix Required:**
Add to client dashboard:
- Subscription info card
- Billing history
- Usage statistics
- Service status indicators

---

### 16. Onboarding Flow Missing
**Status:** Not Implemented

**Evidence:**
- Database field: `companies.onboarding_completed_at`
- Field exists but no onboarding flow

**Missing:**
- ❌ Welcome wizard for new clients
- ❌ Onboarding checklist
- ❌ Progress tracking
- ❌ Guided tour of features
- ❌ Sample request creation walkthrough

**Fix Required:**
Create onboarding wizard:
1. Welcome screen
2. Profile setup
3. First request tutorial
4. Communication guide
5. Mark onboarding complete

---

## 🔵 CODE QUALITY ISSUES

### 17. Excessive Use of `as any`
**Severity:** MEDIUM
**Count:** 14 files

**Problem:**
```typescript
// src/app/api/webhooks/woo/route.ts (line 123)
if ((error as any).code === 'PGRST116') {
  // Bypasses TypeScript type safety
}
```

**Files Affected:**
- `src/app/api/webhooks/woo/route.ts` - 5 instances
- `src/app/api/requests/route.ts` - 3 instances
- Multiple other API routes

**Impact:**
- No compile-time type checking
- Runtime errors harder to debug
- Refactoring becomes dangerous

**Fix Required:**
- Define proper error types
- Use type guards instead of `as any`
- Enable strict TypeScript mode

---

### 18. Silent Error Handling
**Severity:** MEDIUM
**Pattern:** Multiple components

**Examples:**
```typescript
// TemplatesPage (line 56)
} catch {
  // Silently fail
}

// WorkflowsPage (line 37)
} catch {
  // Silently fail
}

// AnalyticsPage (line 61)
} catch {
  // Silently fail
}
```

**Impact:**
- Users don't know when operations fail
- No error feedback
- Debugging difficult

**Fix Required:**
- Replace silent catches with toast notifications
- Log errors to monitoring service
- Show user-friendly error messages

---

### 19. Missing Form Validations
**Severity:** MEDIUM
**Files:** Multiple form components

**Current State:**
- Basic HTML5 `required` attribute only
- No email format validation
- No phone number validation
- No URL format validation
- No custom error messages

**Examples Needing Validation:**
- Company email (format check)
- Company phone (international format)
- Website URL (valid URL check)
- Social media URLs (platform-specific validation)
- Employee count (positive number)
- Service price (positive number, max decimals)
- Date ranges (start < end)

**Fix Required:**
- Implement Zod schema validation
- Add custom validation messages
- Add real-time field validation
- Show validation errors inline

---

## ⚡ PERFORMANCE ISSUES

### 20. No Caching Strategy
**Severity:** MEDIUM

**Problems:**
- Analytics queries recalculate on every page load
- Company list fetched fresh every time
- Team members list not cached
- No Redis/memory cache

**Impact:**
- Slow dashboard loads
- Unnecessary database queries
- Poor user experience

**Fix Required:**
1. Implement Next.js caching for static data
2. Add Redis for session/frequently accessed data
3. Use SWR or React Query for client-side caching
4. Add cache invalidation strategy

---

### 21. Large Bundle Size Potential
**Severity:** LOW-MEDIUM

**Concerns:**
- Recharts (charts library) is heavy (~400KB)
- TipTap editor adds size
- No code splitting visible for admin-only routes
- All components loaded upfront

**Fix Required:**
- Lazy load admin components
- Split charts into separate bundle
- Use dynamic imports for heavy components
- Analyze bundle with `@next/bundle-analyzer`

---

## 🧪 TESTING GAPS

### 22. Minimal Test Coverage
**Severity:** MEDIUM
**Current Coverage:** ~5% estimated

**Tests Found:** 4 files
- `__tests__/permissions.test.ts`
- `__tests__/status-transitions.test.ts`
- `__tests__/types.test.ts`
- `__tests__/woo-webhook.test.ts`

**Missing Tests:**
- ❌ API route tests (0 of 29 routes tested)
- ❌ Component tests (minimal coverage)
- ❌ Integration tests
- ❌ E2E tests
- ❌ Edge case testing
- ❌ Error scenario testing

**Fix Required:**
1. Add tests for all API routes
2. Test error scenarios
3. Test authentication/authorization
4. Add E2E tests with Playwright
5. Set minimum coverage threshold (80%)

---

## ♿ ACCESSIBILITY ISSUES

### 23. Missing ARIA Labels
**Severity:** LOW-MEDIUM
**Count:** Only 8 files with aria-labels

**Missing From:**
- Kanban drag-and-drop (keyboard navigation)
- File upload dropzone (screen reader support)
- Date pickers (ARIA role attributes)
- Modal dialogs (focus management)
- Form error messages (aria-live regions)
- Loading states (aria-busy)

**Fix Required:**
1. Add ARIA labels to all interactive elements
2. Test with screen readers
3. Ensure keyboard navigation works
4. Add focus indicators
5. Test with WAVE accessibility tool

---

## 📊 PRIORITY MATRIX

| Priority | Issue | Impact | Effort | Risk |
|----------|-------|--------|--------|------|
| P0 | Hardcoded credentials | CRITICAL | 1h | Security Breach |
| P0 | Webhook signature optional | CRITICAL | 2h | Data Corruption |
| P1 | Empty product plan map | HIGH | 1h | Revenue Loss |
| P1 | No rate limiting | HIGH | 4h | DoS Attacks |
| P1 | N+1 queries | HIGH | 3h | Performance |
| P2 | Missing indexes | MEDIUM | 2h | Performance |
| P2 | Input validation | MEDIUM | 8h | Security |
| P2 | File upload incomplete | MEDIUM | 12h | Feature Gap |
| P2 | Email service missing | MEDIUM | 16h | Feature Gap |
| P3 | Silent error handling | LOW | 6h | UX |
| P3 | Form validations | LOW | 8h | UX |
| P3 | Test coverage | LOW | 40h | Reliability |
| P3 | Accessibility | LOW | 16h | Compliance |

---

## 🎯 RECOMMENDED ACTION PLAN

### Week 1: Security & Critical Fixes
- [ ] Rotate all credentials (P0)
- [ ] Fix webhook signature validation (P0)
- [ ] Configure product plan mapping (P1)
- [ ] Implement rate limiting (P1)

### Week 2: Performance & Infrastructure
- [ ] Fix N+1 queries (P1)
- [ ] Add database indexes (P2)
- [ ] Implement caching strategy (P2)
- [ ] Configure file upload storage (P2)

### Week 3: Feature Completion
- [ ] Set up email service (P2)
- [ ] Add comprehensive input validation (P2)
- [ ] Expand settings page (P2)
- [ ] Build webhook management UI (P2)

### Week 4: Polish & Testing
- [ ] Fix silent error handling (P3)
- [ ] Add form validations with Zod (P3)
- [ ] Write API route tests (P3)
- [ ] Add ARIA labels for accessibility (P3)

---

## 📝 CONCLUSION

**Overall Assessment:** The application is **70-80% complete** with a solid foundation.

**Strengths:**
- ✅ Core features well-implemented
- ✅ Database schema comprehensive
- ✅ Modern tech stack
- ✅ Good component organization

**Critical Gaps:**
- ⚠️ Security issues need immediate attention
- ⚠️ Configuration incomplete (WooCommerce mapping)
- ⚠️ Performance issues will impact scale
- ⚠️ Missing tests increase risk

**Production Readiness:** ~2-4 weeks of work needed before production launch.

---

**Document End**
