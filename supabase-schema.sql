-- Smart Cow Waste Cleaning App - Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Will be hashed
  role TEXT NOT NULL CHECK (role IN ('farmer', 'compost_processor', 'seller', 'buyer', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  product_owner_role TEXT CHECK (product_owner_role IN ('seller', 'compostProcessor')),
  owner_user_id TEXT,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  description TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  seller_role TEXT CHECK (seller_role IN ('seller', 'compostProcessor')),
  seller_name TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_idr DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forum discussions table
CREATE TABLE IF NOT EXISTS forum_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  liked_users TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Forum comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID REFERENCES forum_discussions(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Educational articles table
CREATE TABLE IF NOT EXISTS educational_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  publish_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending articles table (for admin review)
CREATE TABLE IF NOT EXISTS pending_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Robot status table
CREATE TABLE IF NOT EXISTS robot_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  online BOOLEAN NOT NULL DEFAULT false,
  battery INTEGER NOT NULL DEFAULT 0 CHECK (battery >= 0 AND battery <= 100),
  state TEXT NOT NULL DEFAULT 'offline' CHECK (state IN ('idle', 'cleaning', 'charging', 'offline')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Robot activities table
CREATE TABLE IF NOT EXISTS robot_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  waste_collected DECIMAL(10, 2) NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Robot logs table
CREATE TABLE IF NOT EXISTS robot_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Notifications table (REMOVED - no UI for notifications yet)
-- Uncomment if you want to add notification feature in the future
-- CREATE TABLE IF NOT EXISTS notifications (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   user_id TEXT NOT NULL,
--   title TEXT NOT NULL,
--   message TEXT NOT NULL,
--   read BOOLEAN NOT NULL DEFAULT false,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_forum_discussions_author_id ON forum_discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_discussion_id ON forum_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON chat_messages(receiver_id);
-- Notification indexes (REMOVED)
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
-- CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Insert default admin user
-- Password: admin123 (you should hash this properly in production)
INSERT INTO users (id, name, email, password, role, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Administrator',
  'admin@smartcow.com',
  'admin123', -- TODO: Hash this password properly
  'admin',
  'active',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS) - Basic setup
-- You can customize these policies based on your security needs
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE robot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
-- Notifications RLS (REMOVED)
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow all for now - customize later)
-- For production, you should create proper policies based on user roles
CREATE POLICY "Allow all operations for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON forum_discussions FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON forum_comments FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON educational_articles FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON pending_articles FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON robot_status FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON robot_activities FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON robot_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON user_settings FOR ALL USING (true);
-- Notifications policy (REMOVED)
-- CREATE POLICY "Allow all operations for authenticated users" ON notifications FOR ALL USING (true);

