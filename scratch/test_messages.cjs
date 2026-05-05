const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessagesSelect() {
    console.log('--- Testing messages select query ---');
    
    const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, sender_name, text, timestamp, read, attachments, reactions')
        .limit(1);

    if (error) {
        console.error('Query failed:', error);
    } else {
        console.log('Success:', data);
    }
}

testMessagesSelect();
