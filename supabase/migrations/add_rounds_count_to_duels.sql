-- Add missing rounds_count column to duels table
-- This column is incremented by a trigger when challenges are completed
ALTER TABLE duels ADD COLUMN rounds_count INTEGER DEFAULT 0;
