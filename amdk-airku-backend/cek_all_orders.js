/**
 * Cek semua data yang ada di orders table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrders() {
    try {
        console.log('=== CHECKING ORDERS TABLE ===\n');
        
        // Get sample orders
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, desired_delivery_date, status')
            .order('desired_delivery_date', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('Error:', error);
            return;
        }
        
        console.log(`📊 Total orders (last 20): ${orders.length}\n`);
        
        // Group by date and status
        const grouped = {};
        orders.forEach(order => {
            const date = order.desired_delivery_date || 'NULL';
            const status = order.status;
            const key = `${date} [${status}]`;
            grouped[key] = (grouped[key] || 0) + 1;
        });
        
        console.log('Dates with their statuses:');
        console.log('─────────────────────────');
        Object.entries(grouped).forEach(([key, count]) => {
            console.log(`${key}: ${count} orders`);
        });
        
        // Check for date 11/01 or 01/11 or similar
        console.log('\n\n🔍 Searching for January 11 dates...');
        const { data: janOrders, error: janError } = await supabase
            .from('orders')
            .select('id, desired_delivery_date, status')
            .ilike('desired_delivery_date', '%01-11%');
        
        if (janOrders && janOrders.length > 0) {
            console.log(`\nFound ${janOrders.length} orders with "01-11" in date`);
            janOrders.slice(0, 5).forEach(o => {
                console.log(`  - ${o.desired_delivery_date} [${o.status}]`);
            });
        } else {
            console.log('No orders found with "01-11" format');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkOrders();
