const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRatings() {
    console.log('Checking user_ratings table...');
    const { data, error, count } = await supabase
        .from('user_ratings')
        .select('*', { count: 'exact' });
    
    if (error) {
        console.error('Error fetching ratings:', error);
    } else {
        console.log('Total ratings found:', count);
        console.log('Sample data:', data.slice(0, 2));
    }

    console.log('\nChecking user_comments table for ratings...');
    const { count: commentRatings } = await supabase
        .from('user_comments')
        .select('*', { count: 'exact' })
        .gt('rating', 0);
    
    console.log('Comments with ratings > 0:', commentRatings);
}

checkRatings();
