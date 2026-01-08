require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('count', { count: 'exact' });
        
        console.log('Stores table check:', data, error);
        
        const { data: sample } = await supabase
            .from('stores')
            .select('*')
            .limit(1);
        
        console.log('Sample store:', sample);
        
    } catch (e) {
        console.error(e.message);
    } finally {
        process.exit(0);
    }
}

check();
