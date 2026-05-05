const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('--- Testing getAllUsers query ---');
    const startTime = Date.now();
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, avatar_config, status, last_active, phone_number')
            .limit(100);

        const duration = Date.now() - startTime;
        if (error) {
            console.error('Query Error:', error.message);
        } else {
            console.log(`Query Success in ${duration}ms. Found ${data?.length || 0} users.`);
            if (data && data.length > 0) {
                console.log('First user:', data[0].name);
            }
        }
    } catch (e) {
        console.error('Unexpected:', e);
    }
}

testFetch();
