/**
 * Debug script sederhana untuk cek data orders tanggal 11/01/2026 di Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials tidak ditemukan di .env!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOrders() {
    try {
        console.log('=== DEBUG DATA ORDERS TANGGAL 11/01/2026 ===\n');
        
        const deliveryDate = '2026-01-11';
        console.log('📅 Tanggal:', deliveryDate);
        console.log('');
        
        // Query orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, store_id, desired_delivery_date, status')
            .eq('desired_delivery_date', deliveryDate)
            .in('status', ['Pending', 'Scheduled']);
        
        if (ordersError) {
            console.error('❌ Error:', ordersError);
            return;
        }
        
        console.log(`📊 Total orders: ${orders.length}`);
        
        if (orders.length === 0) {
            console.log('\n❌ TIDAK ADA DATA ORDERS UNTUK TANGGAL INI!');
            console.log('\nCEK:');
            console.log('  1. Apakah ada orders di Supabase?');
            console.log('  2. Apakah status orders adalah Pending atau Scheduled?');
            console.log('  3. Apakah desired_delivery_date sama persis dengan 2026-01-11?');
            return;
        }
        
        // Get store info
        const storeIds = [...new Set(orders.map(o => o.store_id))];
        const { data: stores, error: storesError } = await supabase
            .from('stores')
            .select('id, name, lat, lng, region')
            .in('id', storeIds);
        
        const storeMap = stores.reduce((acc, s) => {
            acc[s.id] = s;
            return acc;
        }, {});
        
        // Get order items dan calculate demand
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('order_id, product_id, quantity, products(capacity_unit, capacity_conversion_heterogeneous)')
            .in('order_id', orders.map(o => o.id));
        
        const itemsByOrderId = orderItems.reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
        }, {});
        
        // Calculate demand
        const calculateDemand = (items) => {
            if (!items || items.length === 0) return 0;
            const uniqueProducts = new Set(items.map(i => i.product_id));
            const isHomogeneous = uniqueProducts.size === 1;
            let total = 0;
            items.forEach(item => {
                const conv = isHomogeneous 
                    ? (item.products?.capacity_unit || 1) 
                    : (item.products?.capacity_conversion_heterogeneous || item.products?.capacity_unit || 1);
                total += item.quantity * conv;
            });
            return total;
        };
        
        // Display summary
        console.log('\n📋 DETAIL ORDERS:\n');
        let totalDemand = 0;
        orders.forEach((order, idx) => {
            const store = storeMap[order.store_id];
            const items = itemsByOrderId[order.id] || [];
            const demand = calculateDemand(items);
            totalDemand += demand;
            
            console.log(`${idx + 1}. Order: ${order.id.substring(0, 8)}`);
            console.log(`   Store: ${store?.name || 'Unknown'} (${store?.region || 'N/A'})`);
            console.log(`   Items: ${items.length} | Demand: ${demand} units`);
            console.log('');
        });
        
        // Group by store
        const storeOrders = {};
        orders.forEach(order => {
            const storeId = order.store_id;
            if (!storeOrders[storeId]) {
                const store = storeMap[storeId];
                storeOrders[storeId] = {
                    storeName: store?.name || 'Unknown',
                    region: store?.region || 'Unknown',
                    orders: [],
                    totalDemand: 0
                };
            }
            const items = itemsByOrderId[order.id] || [];
            const demand = calculateDemand(items);
            storeOrders[storeId].orders.push(order.id);
            storeOrders[storeId].totalDemand += demand;
        });
        
        console.log('\n🏪 GROUPED BY STORE:\n');
        const storeList = Object.entries(storeOrders);
        console.log(`Total Toko: ${storeList.length}`);
        console.log('');
        
        storeList.forEach(([storeId, data]) => {
            console.log(`${data.storeName} (${data.region})`);
            console.log(`  - Orders: ${data.orders.length}`);
            console.log(`  - Total Demand: ${data.totalDemand} units`);
            console.log('');
        });
        
        // Summary
        console.log('📈 SUMMARY:\n');
        console.log(`Total Orders: ${orders.length}`);
        console.log(`Total Stores: ${storeList.length}`);
        console.log(`Total Demand: ${totalDemand} units`);
        console.log(`\nL300 Capacity: 200 units`);
        console.log(`Minimal Routes: ${Math.ceil(totalDemand / 200)} rute`);
        console.log(`\n✅ DATA TERSEDIA DAN SIAP UNTUK DEBUGGING ALGORITMA`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

debugOrders();
