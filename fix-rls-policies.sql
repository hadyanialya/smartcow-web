-- Fix RLS Policies untuk Supabase
-- Run ini di Supabase SQL Editor jika ada error 406 atau 403

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON products;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON orders;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON forum_discussions;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON forum_comments;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON chat_messages;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON educational_articles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON pending_articles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON robot_status;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON robot_activities;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON robot_logs;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_settings;

-- Create new policies that allow all operations (for development)
-- For production, you should create more restrictive policies

-- Users table policies
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Products table policies
CREATE POLICY "Allow all operations on products" ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Orders table policies
CREATE POLICY "Allow all operations on orders" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Forum discussions policies
CREATE POLICY "Allow all operations on forum_discussions" ON forum_discussions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Forum comments policies
CREATE POLICY "Allow all operations on forum_comments" ON forum_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Chat messages policies
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Educational articles policies
CREATE POLICY "Allow all operations on educational_articles" ON educational_articles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Pending articles policies
CREATE POLICY "Allow all operations on pending_articles" ON pending_articles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Robot status policies
CREATE POLICY "Allow all operations on robot_status" ON robot_status
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Robot activities policies
CREATE POLICY "Allow all operations on robot_activities" ON robot_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Robot logs policies
CREATE POLICY "Allow all operations on robot_logs" ON robot_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- User settings policies
CREATE POLICY "Allow all operations on user_settings" ON user_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

