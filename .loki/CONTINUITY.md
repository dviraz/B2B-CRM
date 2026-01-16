# CONTINUITY.md - Working Memory

## Current State
- **Phase:** ARCHITECTURE
- **Status:** IN_PROGRESS
- **Last Updated:** 2026-01-13
- **Project:** AgencyOS (Client Portal & Agency Fulfillment System)

## What I'm Doing NOW
Designing system architecture and creating OpenAPI specification for AgencyOS.

## PRD Summary
- DesignJoy-style productized service with queue constraints
- WooCommerce subscription sync via webhooks
- Kanban board with 4 columns (queue, active, review, done)
- Plan tiers limit active requests (standard=1, pro=2)
- Async-only communication via comments

## Immediate Next Steps
1. Create OpenAPI specification
2. Initialize Next.js 15 project with Shadcn UI
3. Set up Supabase schema with RLS policies
4. Build webhook integration

## Context Needed for Resume
- Tech: Next.js 15, Tailwind, Shadcn UI, Supabase
- Key constraint: Only admins can move requests to "Active"
- WooCommerce handles billing, CRM syncs via webhooks

## Blocked On
Nothing - proceeding autonomously

## Mistakes & Learnings
(None yet)

## Active Subagents
(None currently)

## Checkpoint
- [x] Directory structure created
- [x] Queue files initialized
- [x] State files initialized
- [x] Git repository initialized
- [x] CLAUDE.md created
- [x] PRD saved to .loki/specs/PRD.md
- [ ] OpenAPI spec created
- [ ] Project infrastructure set up
- [ ] Database schema implemented
