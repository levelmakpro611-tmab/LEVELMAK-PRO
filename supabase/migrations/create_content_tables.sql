-- Up Migration: Create user content tables

-- 1. Table for custom quizzes
CREATE TABLE IF NOT EXISTS user_quizzes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for custom stories
CREATE TABLE IF NOT EXISTS user_stories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  likes INT DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table for custom flashcard decks
CREATE TABLE IF NOT EXISTS user_flashcard_decks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  card_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table for custom flashcards
CREATE TABLE IF NOT EXISTS user_flashcards (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  deck_id TEXT REFERENCES user_flashcard_decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  interval INT DEFAULT 0,
  ease_factor NUMERIC DEFAULT 2.5,
  repetitions INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own quizzes" ON user_quizzes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own stories" ON user_stories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own flashcard decks" ON user_flashcard_decks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own flashcards" ON user_flashcards
  FOR ALL USING (auth.uid() = user_id);

-- 5. Table for Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('avatar', 'badge', 'theme', 'potion', 'wallpaper')),
  image TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for shop_items
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- Read policy: anyone can view shop items
CREATE POLICY "Anyone can view shop items" ON shop_items
  FOR SELECT USING (true);

-- Write/Manage policy: only admins can manage shop items
CREATE POLICY "Admins can manage shop items" ON shop_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

