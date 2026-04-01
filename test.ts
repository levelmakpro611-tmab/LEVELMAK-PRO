import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { error } = await supabase.from('profiles').update({
    avatar_config: { test: 1 },
    coach_sessions: []
  }).eq('id', '99f54571-6039-499f-bcd4-186e58d1f1ae');
  console.log('Error:', error);
}

run();
