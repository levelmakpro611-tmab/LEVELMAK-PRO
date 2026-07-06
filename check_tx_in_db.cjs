const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://suvoancswyueirmwhyvx.supabase.co';
const supabaseAnonKey = 'sb_publishable_SwmxfOhP9clf4p9IjHJCaQ_ooe5WUip';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Querying recent profiles...');
  const { data, error } = await supabase
    .from('user_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Profiles in DB:', JSON.stringify(data, null, 2));
  }
}

check();
