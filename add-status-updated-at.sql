-- Add status_updated_at column to orders table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

-- Update existing orders to set status_updated_at to created_at if null
UPDATE orders 
SET status_updated_at = created_at 
WHERE status_updated_at IS NULL;

