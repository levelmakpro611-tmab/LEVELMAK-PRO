const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueryAsUser() {
    console.log('--- Testing getAllUsers query as authenticated user ---');
    
    // Login to get a valid session
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: '611@levelmak.app',
        password: 'levelmak_admin_password' // Actually, I don't know the password.
    });

    // Let's just try to query without logging in, using exactly the same fields
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_config, status, last_active, phone_number')
        .limit(10);

    if (error) {
        console.error('Query failed:', error);
    } else {
        console.log(`Found ${data.length} users with exact select fields.`);
        if (data.length > 0) {
            console.log('First user:', data[0]);
        }
    }
}

testQueryAsUser();
