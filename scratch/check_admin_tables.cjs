const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMoreTables() {
    console.log('--- Checking for specific tables in adminService.ts ---');
    try {
        const tables = ['profiles', 'admin_logs', 'user_comments', 'user_ratings', 'teacher_applications', 'teachers'];
        for (const table of tables) {
            const { error, status } = await supabase.from(table).select('*').limit(1);
            console.log(`Table '${table}': Status ${status}, Error Code: ${error?.code || 'None'}`);
        }
    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

checkMoreTables();
