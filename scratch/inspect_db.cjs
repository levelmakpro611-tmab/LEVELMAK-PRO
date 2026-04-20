const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    console.log('--- Inspecting Profile Columns ---');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Select Error:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Row found! Keys:', Object.keys(data[0]));
        } else {
            console.log('No rows found (possibly RLS or empty table).');
        }

    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

inspectTable();
