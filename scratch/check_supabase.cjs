const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    console.log('--- Checking Profiles Table ---');
    try {
        const { count, error, status } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        console.log('Exact Count:', count);
        console.log('Error:', error);
        console.log('Status:', status);

        const { data: sample, error: sampleError } = await supabase
            .from('profiles')
            .select('id, name, role')
            .limit(5);
        
        console.log('Sample Data Rows:', sample?.length);
        if (sampleError) console.log('Sample Error:', sampleError);
        if (sample) console.log('Sample IDs:', sample.map(u => u.id));

    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

checkProfiles();
