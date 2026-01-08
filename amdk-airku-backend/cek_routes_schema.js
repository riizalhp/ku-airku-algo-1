/**
 * Cek struktur tabel routes
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRoutes() {
    try {
        console.log('=== CHECKING ROUTES TABLE ===\n');
        
        // Get sample route
        const { data: sample } = await supabase
            .from('routes')
            .select('*')
            .limit(1);
        
        if (sample && sample.length > 0) {
            console.log('📋 Route columns:', Object.keys(sample[0]));
            console.log('\nSample route:');
            console.log(JSON.stringify(sample[0], null, 2));
        }
        
        // Get routes for 2026-01-11
        const deliveryDate = '2026-01-11';
        
        const { data: routes1 } = await supabase
            .from('routes')
            .select('id, date, driver_id')
            .eq('date', deliveryDate);
        
        console.log(`\n\nRoutes with date='${deliveryDate}': ${routes1?.length || 0}`);
        if (routes1?.length) {
            routes1.forEach((r, idx) => {
                console.log(`${idx+1}. ${r.id.substring(0, 8)} - Driver: ${r.driver_id}`);
            });
        }
        
        // Also try route_date
        const { data: routes2 } = await supabase
            .from('routes')
            .select('id, route_date, driver_id')
            .eq('route_date', deliveryDate);
        
        console.log(`\nRoutes with route_date='${deliveryDate}': ${routes2?.length || 0}`);
        if (routes2?.length) {
            routes2.forEach((r, idx) => {
                console.log(`${idx+1}. ${r.id.substring(0, 8)} - Driver: ${r.driver_id}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkRoutes();
