-- LIVE SECURITY HOTFIX · 13 Oct 2026 · legacy (current live site) tables
--
-- Problem: these seven policies let anyone with the public anon key read EVERY row
-- (USING true), including pending, rejected and deleted listings, contact emails,
-- manage_token and verification_token. Policies are OR-ed together, so they override
-- the safer "Public can read active ... listings" policies on the same tables.
--
-- Fix: drop only these seven. The "active" policies stay, so the live site still shows
-- every active listing (all live-site anon queries filter status = 'active').
-- Untouched on purpose: "Public can read countries", "Public can read sole_traders",
-- and every "Public can read active ... listings" policy.
--
-- Undo: supabase/legacy/2026-10-13_drop_open_read_policies_REVERSE.sql

drop policy if exists "Public can read cars" on public.cars;
drop policy if exists "Public can read community" on public.community;
drop policy if exists "Public can read companies" on public.companies;
drop policy if exists "Public can read events" on public.events;
drop policy if exists "Public can read housing" on public.housing;
drop policy if exists "Public can read jobs" on public.jobs;
drop policy if exists "Public can read tutors" on public.tutors;
