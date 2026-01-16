# Product Requirements Document (PRD): AgencyOS

## 1. Executive Summary
- **Product Name:** AgencyOS (Internal Codename)
- **Type:** Client Portal & Agency Fulfillment System
- **Business Model:** Productized Service (Subscription-based, Unlimited Requests, Async Communication)

### Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Shadcn UI
- **Backend/DB:** Supabase (PostgreSQL, Auth, Realtime)
- **Billing:** WooCommerce (WordPress) handling payments & subscriptions

## 2. Core Philosophy (The "DesignJoy" Logic)
Unlike traditional CRMs, this system is built on constraints:
- **The Queue:** Clients can add infinite requests, but they stay in a "Queue" state
- **The Choke Point:** Only X requests can be "Active" (In Progress) at a time, based on client's subscription tier
- **Async Only:** No live chat. Communication via comments on specific Request cards

## 3. User Roles

### 3.1 The Client
- **Goal:** Submit requests, see progress, download assets, manage subscription
- **Pain Point:** "I don't want to email back and forth. I want to see where my project is."

### 3.2 The Agency Admin
- **Goal:** View all active requests across all clients, move items from "Queue" to "In Progress," deliver files
- **Pain Point:** "I don't want to check if a client has paid before I start working." (System auto-locks churned clients)

## 4. Functional Requirements

### 4.1 Authentication & Onboarding
- Users do NOT "sign up" freely - accounts provisioned automatically upon WooCommerce purchase
- **Flow:**
  1. Client buys "Pro Package" on WordPress
  2. WooCommerce Webhook hits Next.js API
  3. System creates Supabase Auth User & emails "Set Password" link
- **Magic Link:** Allow passwordless login via email magic link

### 4.2 The "Queue" System (Kanban)
- **Visual Interface:** Trello-style board with 4 columns:
  - **Backlog/Queue:** Client adds unlimited cards here
  - **Active/In Progress:** Admin moves cards here (Limited by max_active_requests)
  - **Review:** Admin moves here when work is submitted
  - **Complete:** Client or Admin marks as done

- **Constraint Logic:**
  - Client CANNOT drag cards to "Active" - only Admin can
  - System prevents Admin from exceeding active limit based on plan tier

### 4.3 Subscription Sync (The Bridge)
WooCommerce Webhook Status Mapping:
- `Woo active` -> `CRM active` (Full Access)
- `Woo on-hold` -> `CRM paused` (Read-only access)
- `Woo cancelled` -> `CRM churned` (Login disabled)

**Pause Feature:** Client can pause subscription in portal -> triggers WooCommerce API call

## 5. Database Schema (Supabase)

### Table: companies
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary Key |
| name | text | Billing Name |
| status | text | active, paused, churned |
| plan_tier | text | standard (1 active), pro (2 active) |
| max_active_limit | int | Default: 1 |
| stripe_customer_id | text | Future Stripe integration |
| woo_customer_id | text | Link to WordPress User |

### Table: requests
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary Key |
| company_id | uuid | FK to Companies |
| title | text | e.g., "Facebook Ads Creative Q1" |
| description | text | Markdown supported |
| status | text | queue, active, review, done |
| priority | text | low, normal, high |
| assets_link | text | Google Drive / Dropbox URL |
| video_brief | text | Loom URL (Optional) |

### Table: comments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary Key |
| request_id | uuid | FK to Requests |
| user_id | uuid | Who wrote it |
| content | text | The message |
| is_internal | bool | If true, only Admin sees it |

## 6. API Routes (Next.js)

### POST /api/webhooks/woo
- **Trigger:** WooCommerce subscription.created or subscription.updated
- **Logic:**
  1. Check if woo_customer_id exists in companies
  2. If yes, update status and plan_tier
  3. If no, create new auth.users account and companies entry
  4. Send welcome email

### POST /api/requests/move
- **Trigger:** Admin drags card to "Active"
- **Logic:**
  1. Fetch company.max_active_limit
  2. Count current requests where status = 'active' AND company_id = X
  3. If current >= max, return Error: "Client limit reached"

## 7. UI/UX Specifications

### Client Dashboard
- **Header:** Shows "Active Requests: 1/1" (visual limit indicator)
- **Main Action:** Big "New Request" button
- **View:** Kanban Board

### Admin Dashboard
- **Bird's Eye View:** List of all Companies with columns:
  - Company Name
  - Plan (Standard/Pro)
  - Active Request (current card title)
  - Status (Active/Paused)
- **Drill Down:** Click company -> opens their Kanban board

## 8. Security (RLS Policies)

### companies
- **Select:** Users see own company. Admins see all.

### requests
- **Select/Insert/Update:** Users can act on requests where company_id matches assigned company
- **Delete:** Users can ONLY delete requests in queue status. Once active, only Admin can archive.

## 9. Future Phase (Not MVP)
- Add-on Purchases: One-off boosts (+1 Active Request for 7 days)
- Metrics: "Requests Completed This Month" chart
