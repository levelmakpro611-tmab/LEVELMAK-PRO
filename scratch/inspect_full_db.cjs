const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect(table) {
    console.log(`--- Inspecting ${table} ---`);
    try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`${table} Error:`, error.message);
            return;
        }
        if (data && data.length > 0) {
            console.log(`${table} Keys:`, Object.keys(data[0]));
        } else {
            console.log(`${table} is empty.`);
        }
    } catch (e) {
        console.error(`${table} Unexpected:`, e);
    }
}

async function run() {
    await inspect('profiles');
    await inspect('messages');
    await inspect('conversations');
    await inspect('calls');
}

run();
