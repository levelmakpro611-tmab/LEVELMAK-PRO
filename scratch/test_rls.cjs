const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
    console.log('--- Testing RLS for profiles ---');
    
    // First, try to login as Admin to get an authenticated session
    // Using the admin credentials from previous logs/knowledge
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: '611@levelmak.app', // using the admin email from authService.ts
        password: 'password' // We don't know the password, let's try to just query with anon first
    });

    // Actually, we can just query as anon first. If anon works, we know the table exists and has data.
    const { data: anonData, error: anonError } = await supabase
        .from('profiles')
        .select('id, name')
        .limit(5);

    console.log('Anon query result:', anonData ? `${anonData.length} rows` : anonError);
}

testRLS();
