const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
  const { data, error } = await supabase.from('calls').select('*').limit(1);
  if (error) {
    console.error('Error fetching from calls:', error);
  } else {
    console.log('Columns in calls:', Object.keys(data[0] || {}));
  }

  const { data: convData, error: convError } = await supabase.from('conversations').select('*').limit(1);
  if (convError) {
    console.error('Error fetching from conversations:', convError);
  } else {
    console.log('Columns in conversations:', Object.keys(convData[0] || {}));
  }
}

checkCols();
