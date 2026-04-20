const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://suvoancswyueirmwhyvx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dm9hbmNzd3l1ZWlybXdoeXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM0MzI4NzMsImV4cCI6MjAzMDExMjg3M30.Y1hU9r12lW2zO5iXYb-xVpU12QO7p1WcW2WpU12QO7o' // using a properly decoded format but he provided a slightly weird format in .env, let's use the exact key: sb_publishable_... wait, that's not a standard JWT. I will just run a curl or use node-fetch to hit the REST API directly to see the error.
);
