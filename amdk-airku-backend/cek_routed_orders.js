/**
 * Cek orders 11/01/2026 dengan status Routed
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Haversine distance function
function getDistance(loc1, loc2) {
    const R = 6371;
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function checkRoutedOrders() {
    try {
        console.log('=== DATA ORDERS TANGGAL 11/01/2026 (ROUTED) ===\n');
        
        const deliveryDate = '2026-01-11';
        
        // Get all orders (regardless of status)
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, store_id, desired_delivery_date, status')
            .eq('desired_delivery_date', deliveryDate);
        
        if (ordersError || !orders || orders.length === 0) {
            console.error('❌ No orders found');
            return;
        }
        
        console.log(`📊 Total orders: ${orders.length}`);
        console.log(`Status distribution:`);
        const byStatus = {};
        orders.forEach(o => {
            byStatus[o.status] = (byStatus[o.status] || 0) + 1;
        });
        Object.entries(byStatus).forEach(([status, count]) => {
            console.log(`   - ${status}: ${count}`);
        });
        
        // Get store info
        const storeIds = [...new Set(orders.map(o => o.store_id))];
        const { data: stores } = await supabase
            .from('stores')
            .select('id, name, lat, lng, region')
            .in('id', storeIds);
        
        const storeMap = (stores || []).reduce((acc, s) => {
            acc[s.id] = s;
            return acc;
        }, {});
        
        // Get order items
        const { data: orderItems } = await supabase
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
        
        // Group by store
        console.log('\n🏪 DATA ORDERS:\n');
        const storeOrders = {};
        let totalDemand = 0;
        
        orders.forEach((order, idx) => {
            const store = storeMap[order.store_id];
            const items = itemsByOrderId[order.id] || [];
            const demand = calculateDemand(items);
            totalDemand += demand;
            
            if (!storeOrders[order.store_id]) {
                storeOrders[order.store_id] = {
                    storeName: store?.name || 'Unknown',
                    region: store?.region || 'Unknown',
                    location: store ? { lat: store.lat, lng: store.lng } : null,
                    orders: [],
                    totalDemand: 0
                };
            }
            storeOrders[order.store_id].orders.push({
                id: order.id,
                demand: demand,
                status: order.status
            });
            storeOrders[order.store_id].totalDemand += demand;
        });
        
        // Display by store
        const storeList = Object.entries(storeOrders);
        storeList.forEach(([storeId, data], idx) => {
            const location = data.location ? `(${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)})` : '';
            console.log(`${idx + 1}. ${data.storeName} - ${data.region} ${location}`);
            console.log(`   📦 Orders: ${data.orders.length}`);
            console.log(`   📊 Total Demand: ${data.totalDemand} units`);
            data.orders.forEach(o => {
                console.log(`      - ${o.id.substring(0, 8)}: ${o.demand} units [${o.status}]`);
            });
            console.log('');
        });
        
        // Summary
        console.log('\n📈 RINGKASAN:\n');
        console.log(`Total Orders: ${orders.length}`);
        console.log(`Total Stores: ${storeList.length}`);
        console.log(`Total Demand: ${Math.round(totalDemand)} units`);
        console.log(`\nKapasitas Armada:`);
        console.log(`  - L300: 200 units`);
        console.log(`  - Cherry Box: 100 units`);
        console.log(`\n🔢 Minimal Routes (L300): ${Math.ceil(totalDemand / 200)} rute`);
        console.log(`🔢 Minimal Routes (Cherry Box): ${Math.ceil(totalDemand / 100)} rute`);
        
        // Check current routes
        console.log('\n\n🚗 CEK RUTE YANG SUDAH DIBUAT:\n');
        const { data: routes } = await supabase
            .from('routes')
            .select('id, driver_id, vehicle_id, stops, created_at')
            .eq('route_date', deliveryDate);
        
        if (routes && routes.length > 0) {
            console.log(`Found ${routes.length} routes`);
            routes.forEach((route, idx) => {
                const stopsCount = route.stops ? route.stops.length : 0;
                console.log(`${idx + 1}. Route (${route.stops ? JSON.parse(JSON.stringify(route.stops)).length : 0} stops) - Driver: ${route.driver_id || 'N/A'}`);
            });
        } else {
            console.log('❌ Tidak ada rute yang dibuat untuk tanggal ini');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

checkRoutedOrders();
