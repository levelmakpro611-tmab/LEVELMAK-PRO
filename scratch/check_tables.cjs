const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('--- Attempting to list tables via RPC if available ---');
    try {
        // We can't easily list tables with anon key unless there's an RPC
        // But we can test existence of common tables
        const tables = ['profiles', 'admin_logs', 'quizzes', 'user_quizzes', 'flashcards', 'user_flashcards'];
        for (const table of tables) {
            const { error, status } = await supabase.from(table).select('*').limit(1);
            console.log(`Table '${table}': Status ${status}, Error Code: ${error?.code || 'None'}`);
        }
    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

listTables();
