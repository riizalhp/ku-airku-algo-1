/**
 * Debug script untuk mengecek kenapa routing untuk tanggal 11/01/2026
 * hanya membuat 1 rute padahal seharusnya 4 rute
 */

require('dotenv').config();
const Order = require('./src/models/orderModel');
const { calculateSavingsMatrixRoutes } = require('./src/services/routingService');

async function debugRoutes() {
    try {
        console.log('=== DEBUG ROUTING UNTUK 11/01/2026 ===\n');
        
        const deliveryDate = '2026-01-11';
        console.log('Tanggal:', deliveryDate);
        console.log('');
        
        // 1. Cek orders yang ada untuk tanggal tersebut
        console.log('1. MENGAMBIL DATA ORDERS...');
        const orders = await Order.findRoutableOrders({ deliveryDate });
        console.log(`   Total orders: ${orders.length}\n`);
        
        if (orders.length === 0) {
            console.log('   ❌ Tidak ada orders untuk tanggal ini!');
            return;
        }
        
        // 2. Tampilkan detail setiap order
        console.log('2. DETAIL ORDERS:');
        console.log('   ┌──────────────────────────────────────────────────────────────────┐');
        console.log('   │ Order ID | Store Name        | Region | Demand | Location      │');
        console.log('   ├──────────────────────────────────────────────────────────────────┤');
        orders.forEach((order, idx) => {
            const id = order.id.substring(0, 8);
            const store = order.storeName?.padEnd(17).substring(0, 17) || 'N/A';
            const region = (order.region || 'N/A').padEnd(6);
            const demand = String(order.demand || 0).padStart(6);
            const lat = order.location?.lat?.toFixed(4) || 'N/A';
            const lng = order.location?.lng?.toFixed(4) || 'N/A';
            console.log(`   │ ${id} | ${store} | ${region} | ${demand} | ${lat},${lng} │`);
        });
        console.log('   └──────────────────────────────────────────────────────────────────┘\n');
        
        // 3. Group by store
        console.log('3. GROUP BY STORE:');
        const storeStops = orders.reduce((acc, order) => {
            if (!acc[order.storeId]) {
                acc[order.storeId] = {
                    storeId: order.storeId,
                    storeName: order.storeName,
                    address: order.address,
                    location: order.location,
                    totalDemand: 0,
                    orderIds: [],
                    region: order.region || 'Unknown'
                };
            }
            acc[order.storeId].totalDemand += order.demand;
            acc[order.storeId].orderIds.push(order.id);
            return acc;
        }, {});
        
        const stores = Object.values(storeStops);
        console.log(`   Total stores: ${stores.length}\n`);
        console.log('   ┌────────────────────────────────────────────────────────────┐');
        console.log('   │ Store Name        | Region | Orders | Total Demand      │');
        console.log('   ├────────────────────────────────────────────────────────────┤');
        stores.forEach(store => {
            const name = store.storeName?.padEnd(17).substring(0, 17) || 'N/A';
            const region = (store.region || 'N/A').padEnd(6);
            const orders = String(store.orderIds.length).padStart(6);
            const demand = String(store.totalDemand).padStart(13);
            console.log(`   │ ${name} | ${region} | ${orders} | ${demand} units │`);
        });
        console.log('   └────────────────────────────────────────────────────────────┘\n');
        
        // 4. Total demand
        const totalDemand = stores.reduce((sum, s) => sum + s.totalDemand, 0);
        console.log(`   TOTAL DEMAND: ${totalDemand} units`);
        console.log(`   L300 CAPACITY: 200 units (untuk heterogeneous load)`);
        console.log(`   Cherry Box CAPACITY: 100 units (untuk heterogeneous load)`);
        console.log(`   Teoritis minimal rute: ${Math.ceil(totalDemand / 200)} rute (dengan L300)\n`);
        
        // 5. Jalankan Clarke-Wright algorithm
        console.log('4. MENJALANKAN CLARKE-WRIGHT ALGORITHM:');
        const depotLocation = { lat: -7.8664161, lng: 110.1486773 }; // PDAM
        const DEFAULT_CAPACITY = 200; // L300 default
        
        const nodes = stores.map(store => ({
            id: store.storeId,
            location: store.location,
            demand: store.totalDemand,
            region: store.region
        }));
        
        console.log(`   Running with capacity: ${DEFAULT_CAPACITY} units`);
        console.log(`   Total nodes: ${nodes.length}`);
        console.log('');
        
        const calculatedTrips = calculateSavingsMatrixRoutes(nodes, depotLocation, DEFAULT_CAPACITY);
        
        console.log(`   ✅ HASIL: ${calculatedTrips.length} rute dibuat\n`);
        
        // 6. Detail setiap rute
        console.log('5. DETAIL SETIAP RUTE:');
        calculatedTrips.forEach((trip, idx) => {
            console.log(`\n   RUTE ${idx + 1}:`);
            console.log('   ┌────────────────────────────────────────────────────────┐');
            console.log('   │ Store Name        | Region | Demand | Orders        │');
            console.log('   ├────────────────────────────────────────────────────────┤');
            
            let routeTotalDemand = 0;
            let routeTotalOrders = 0;
            const routeRegions = [];
            
            trip.forEach(storeId => {
                const store = storeStops[storeId];
                if (store) {
                    const name = store.storeName?.padEnd(17).substring(0, 17) || 'N/A';
                    const region = (store.region || 'N/A').padEnd(6);
                    const demand = String(store.totalDemand).padStart(6);
                    const orders = String(store.orderIds.length).padStart(6);
                    console.log(`   │ ${name} | ${region} | ${demand} | ${orders} orders │`);
                    
                    routeTotalDemand += store.totalDemand;
                    routeTotalOrders += store.orderIds.length;
                    routeRegions.push(store.region);
                }
            });
            
            console.log('   └────────────────────────────────────────────────────────┘');
            console.log(`   Total Stores: ${trip.length}`);
            console.log(`   Total Orders: ${routeTotalOrders}`);
            console.log(`   Total Demand: ${routeTotalDemand} units`);
            console.log(`   Capacity Used: ${(routeTotalDemand / DEFAULT_CAPACITY * 100).toFixed(1)}%`);
            console.log(`   Regions: ${[...new Set(routeRegions)].join(', ')}`);
        });
        
        // 7. Analisis kenapa hanya 1 rute
        console.log('\n\n6. ANALISIS:');
        if (calculatedTrips.length === 1 && totalDemand > DEFAULT_CAPACITY) {
            console.log('   ⚠️  WARNING: Total demand melebihi kapasitas 1 rute!');
            console.log(`   Total demand: ${totalDemand} units`);
            console.log(`   Vehicle capacity: ${DEFAULT_CAPACITY} units`);
            console.log(`   Overload: ${totalDemand - DEFAULT_CAPACITY} units (${((totalDemand - DEFAULT_CAPACITY) / DEFAULT_CAPACITY * 100).toFixed(1)}%)`);
            console.log('\n   KEMUNGKINAN MASALAH:');
            console.log('   1. Clarke-Wright algorithm tidak memisahkan rute dengan benar');
            console.log('   2. Capacity constraint tidak diterapkan dengan benar');
            console.log('   3. Semua stores terlalu dekat sehingga savings selalu positif');
        } else if (calculatedTrips.length < Math.ceil(totalDemand / DEFAULT_CAPACITY)) {
            console.log('   ⚠️  WARNING: Jumlah rute kurang dari teoritis minimal!');
            console.log(`   Rute dibuat: ${calculatedTrips.length}`);
            console.log(`   Rute minimal: ${Math.ceil(totalDemand / DEFAULT_CAPACITY)}`);
        } else {
            console.log('   ✅ Jumlah rute sesuai dengan kapasitas');
        }
        
        console.log('\n=== SELESAI ===');
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

debugRoutes();
