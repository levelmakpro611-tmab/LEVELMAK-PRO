-- Up Migration: Add premium columns and create transaction table

-- 1. Add premium subscription fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- 2. Create table for transactions log
CREATE TABLE IF NOT EXISTS user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FG',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('orange_money', 'wave', 'mtn_money', 'moov_money', 'card')),
  item_type TEXT NOT NULL CHECK (item_type IN ('coins', 'premium')),
  item_quantity INT DEFAULT 1,
  plan_duration TEXT CHECK (plan_duration IN ('weekly', 'monthly', 'annual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on user_transactions
ALTER TABLE user_transactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_transactions
CREATE POLICY "Users can view their own transactions" ON user_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON user_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON user_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
