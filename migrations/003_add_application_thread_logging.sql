-- Migration: Add Discord thread logging columns to applications
-- Date: 2026-02-25

-- Add thread logging columns
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS log_message_id TEXT,
  ADD COLUMN IF NOT EXISTS log_thread_id  TEXT;

-- Add deny_reason column (separate from reviewer_note)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS deny_reason TEXT;

-- Ensure accepted_at/accepted_by/denied_at/denied_by exist (idempotent)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by TEXT,
  ADD COLUMN IF NOT EXISTS denied_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS denied_by   TEXT;

-- Add comment for clarity
COMMENT ON COLUMN applications.log_message_id IS 'Discord message ID of the parent log message posted when application was submitted';
COMMENT ON COLUMN applications.log_thread_id  IS 'Discord thread ID created from the parent log message — all follow-up logs post here';
COMMENT ON COLUMN applications.deny_reason    IS 'Required reason text when application is denied';
