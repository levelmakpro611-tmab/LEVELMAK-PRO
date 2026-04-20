const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function injectTestData() {
    console.log('Injecting test ratings...');
    
    // 1. Get a random user ID from profiles
    const { data: users } = await supabase.from('profiles').select('id, name').limit(1);
    const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';
    const userName = users?.[0]?.name || 'Test User';

    const testRatings = [
        {
            user_id: userId,
            user_name: userName,
            overall: 5,
            features: { quiz: 5, coach: 5, flashcards: 5, library: 5, interface: 5, offline: 5 },
            comment: 'Super application, j\'adore les quiz !',
            timestamp: new Date().toISOString()
        },
        {
            user_id: userId,
            user_name: userName,
            overall: 4,
            features: { quiz: 4, coach: 5, flashcards: 4, library: 3, interface: 5, offline: 4 },
            comment: 'L\'interface est géniale.',
            timestamp: new Date(Date.now() - 3600000).toISOString()
        }
    ];

    const { error } = await supabase.from('user_ratings').insert(testRatings);
    
    if (error) {
        console.error('Error injecting ratings:', error);
    } else {
        console.log('✅ Test ratings injected successfully.');
    }
}

injectTestData();
