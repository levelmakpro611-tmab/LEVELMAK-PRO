const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhone() {
    const { data, error } = await supabase
        .from('profiles')
        .select('name, phone_number')
        .limit(10);

    if (data) {
        console.log('Users with phone numbers:');
        data.forEach(u => console.log(`${u.name}: ${u.phone_number}`));
    }
}

checkPhone();
