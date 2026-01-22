-- Migration 005: Add cover_url and requires_approval to clubs table
-- Date: 2026-01-22
-- Purpose: Support club avatars and configurable join approval

-- Add cover_url column for club avatars
ALTER TABLE clubs 
ADD COLUMN cover_url VARCHAR(500) NULL 
COMMENT 'URL of the club avatar image (300x300px max)';

-- Add requires_approval column for join request settings
ALTER TABLE clubs 
ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT TRUE 
COMMENT 'Whether join requests require admin approval (FALSE = auto-approve)';

-- Add index for faster queries on public clubs with auto-approval
CREATE INDEX idx_clubs_public_approval ON clubs(is_public, requires_approval, status);

-- Verification queries
-- SELECT id, name, cover_url, requires_approval FROM clubs;
