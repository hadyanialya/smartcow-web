-- Update orders table status constraint to include new statuses
-- Run this SQL in your Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint with all statuses
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'packaging', 'shipping', 'delivered', 'completed'));

-- Add revenue_added column to track if revenue was already added for this order
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS revenue_added BOOLEAN DEFAULT FALSE;

