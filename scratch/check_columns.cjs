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
    await checkColumns('messages', ['conversation_id', 'sender_id', 'sender_name', 'text', 'read', 'attachments', 'timestamp', 'image_url']);
    await checkColumns('calls', ['caller_id', 'caller_name', 'caller_avatar', 'receiver_id', 'receiver_name', 'receiver_avatar', 'status', 'type', 'room_name', 'timestamp', 'is_group_call', 'group_id', 'participants']);
}

run();
