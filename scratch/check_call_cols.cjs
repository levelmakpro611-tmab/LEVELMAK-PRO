const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns(table, columns) {
    console.log(`--- Checking ${table} columns ---`);
    for (const col of columns) {
        const { error } = await supabase.from(table).select(col).limit(1);
        if (error) {
            console.log(`[MISSING] ${table}.${col}: ${error.message}`);
        } else {
            console.log(`[OK] ${table}.${col}`);
        }
    }
}

async function run() {
    await checkColumns('messages', ['type', 'call_type', 'call_status', 'call_duration']);
    await checkColumns('calls', ['sdp_offer', 'sdp_answer', 'caller_id', 'receiver_id']);
}

run();
