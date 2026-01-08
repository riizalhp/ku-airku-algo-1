/**
 * Debug script menggunakan Supabase client untuk tanggal 11/01/2026
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

// Fungsi Haversine untuk menghitung jarak
function getDistance(loc1, loc2) {
    const R = 6371; // Earth radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Clarke-Wright Algorithm (simplified)
function calculateSavingsMatrixRoutes(nodes, depotLocation, vehicleCapacity) {
    if (!nodes || nodes.length === 0) return [];

    // 1. Calculate savings for all pairs
    const savings = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            const distADepot = getDistance(nodeA.location, depotLocation);
            const distBDepot = getDistance(nodeB.location, depotLocation);
            const distAB = getDistance(nodeA.location, nodeB.location);
            const saving = distADepot + distBDepot - distAB;
            savings.push({ from: nodeA.id, to: nodeB.id, saving });
        }
    }

    // 2. Sort savings descending
    savings.sort((a, b) => b.saving - a.saving);

    // 3. Initialize routes
    const routes = nodes.map(node => ({
        path: [node.id],
        load: node.demand,
    }));

    // 4. Merge routes based on savings
    for (const { from, to, saving } of savings) {
        if (saving <= 0) break;

        const routeFrom = routes.find(r => r.path.includes(from));
        const routeTo = routes.find(r => r.path.includes(to));

        if (routeFrom !== routeTo) {
            const isFromEndpoint = routeFrom.path[0] === from || routeFrom.path[routeFrom.path.length - 1] === from;
            const isToEndpoint = routeTo.path[0] === to || routeTo.path[routeTo.path.length - 1] === to;

            if (isFromEndpoint && isToEndpoint) {
                if (routeFrom.load + routeTo.load <= vehicleCapacity) {
                    if (routeFrom.path[routeFrom.path.length - 1] === from) {
                        routeFrom.path.reverse();
                    }
                    if (routeTo.path[0] === to) {
                        routeTo.path.reverse();
                    }

                    const newPath = [...routeTo.path, ...routeFrom.path];
                    const newLoad = routeFrom.load + routeTo.load;

                    routeFrom.path = newPath;
                    routeFrom.load = newLoad;

                    routeTo.path = [];
                    routeTo.load = 0;
                }
            }
        }
    }

    // 5. Filter and return
    return routes.filter(r => r.path.length > 0).map(r => r.path);
}

async function debugRoutes() {
    try {
        console.log('=== DEBUG ROUTING UNTUK 11/01/2026 (SUPABASE) ===\n');
        
        const deliveryDate = '2026-01-11';
        console.log('Tanggal:', deliveryDate);
        console.log('');
        
        // 1. Query orders dari Supabase
        console.log('1. MENGAMBIL DATA ORDERS DARI SUPABASE...');
        
        // First, let's try to get all orders and see what fields exist
        const { data: sampleOrders, error: sampleError } = await supabase
            .from('orders')
            .select('*')
            .limit(1);
        
        if (sampleOrders && sampleOrders.length > 0) {
            console.log('   Sample order fields:', Object.keys(sampleOrders[0]));
        }
        
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, deliveryDate, demand, status, storeId')
            .eq('deliveryDate', deliveryDate)
            .in('status', ['Pending', 'Scheduled']);
        
        console.log(`   Total orders: ${orders.length}\n`);
        
        if (orders.length === 0) {
            console.log('   ❌ Tidak ada orders untuk tanggal ini!');
            console.log('\n   💡 Tips: Pastikan ada orders dengan status Pending/Scheduled di Supabase');
            console.log('           untuk tanggal 11/01/2026');
            return;
        }
        
        // Get unique store IDs
        const storeIds = [...new Set(orders.map(o => o.storeId))];
        
        // Fetch stores
        const { data: storeData, error: storesError } = await supabase
            .from('stores')
            .select('id, name, address, lat, lng, region')
            .in('id', storeIds);
        
        if (storesError) {
            console.error('   ❌ Error fetching stores:', storesError);
            return;
        }
        
        // Create store map for easy lookup
        const storeMap = storeData.reduce((acc, store) => {
            acc[store.id] = store;
            return acc;
        }, {});
        
        // Transform data
        const transformedOrders = orders.map(o => {
            const store = storeMap[o.storeId];
            if (!store) {
                console.warn(`   ⚠️ Store not found for order ${o.id}`);
                return null;
            }
            return {
                id: o.id,
                deliveryDate: o.desiredDeliveryDate,
                demand: o.demand,
                status: o.status,
                storeId: store.id,
                storeName: store.name,
                address: store.address,
                location: { lat: store.lat, lng: store.lng },
                region: store.region
            };
        }).filter(o => o !== null);
        
        // 2. Tampilkan detail setiap order
        console.log('2. DETAIL ORDERS:');
        console.log('   ┌──────────────────────────────────────────────────────────────────────┐');
        console.log('   │ Order ID | Store Name        | Region | Demand | Location          │');
        console.log('   ├──────────────────────────────────────────────────────────────────────┤');
        transformedOrders.forEach((order, idx) => {
            const id = order.id.substring(0, 8);
            const store = order.storeName?.padEnd(17).substring(0, 17) || 'N/A';
            const region = (order.region || 'N/A').padEnd(6);
            const demand = String(order.demand || 0).padStart(6);
            const lat = order.location?.lat?.toFixed(4) || 'N/A';
            const lng = order.location?.lng?.toFixed(4) || 'N/A';
            console.log(`   │ ${id} | ${store} | ${region} | ${demand} | ${lat},${lng} │`);
        });
        console.log('   └──────────────────────────────────────────────────────────────────────┘\n');
        
        // 3. Group by store
        console.log('3. GROUP BY STORE:');
        const storeStops = transformedOrders.reduce((acc, order) => {
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
        console.log('   ┌────────────────────────────────────────────────────────────────┐');
        console.log('   │ Store Name        | Region | Orders | Total Demand          │');
        console.log('   ├────────────────────────────────────────────────────────────────┤');
        stores.forEach(store => {
            const name = store.storeName?.padEnd(17).substring(0, 17) || 'N/A';
            const region = (store.region || 'N/A').padEnd(6);
            const orders = String(store.orderIds.length).padStart(6);
            const demand = String(store.totalDemand).padStart(13);
            console.log(`   │ ${name} | ${region} | ${orders} | ${demand} units │`);
        });
        console.log('   └────────────────────────────────────────────────────────────────┘\n');
        
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
            console.log(`   Remaining Capacity: ${DEFAULT_CAPACITY - routeTotalDemand} units`);
            console.log(`   Regions: ${[...new Set(routeRegions)].join(', ')}`);
        });
        
        // 7. Analisis kenapa hanya 1 rute
        console.log('\n\n6. ANALISIS MASALAH:');
        if (calculatedTrips.length === 1 && totalDemand > DEFAULT_CAPACITY) {
            console.log('   ⚠️  WARNING: Total demand melebihi kapasitas 1 rute!');
            console.log(`   Total demand: ${totalDemand} units`);
            console.log(`   Vehicle capacity: ${DEFAULT_CAPACITY} units`);
            console.log(`   Overload: ${totalDemand - DEFAULT_CAPACITY} units (${((totalDemand - DEFAULT_CAPACITY) / DEFAULT_CAPACITY * 100).toFixed(1)}%)`);
            console.log('\n   🔍 KEMUNGKINAN PENYEBAB:');
            console.log('   1. ❌ Clarke-Wright algorithm tidak memisahkan rute dengan benar');
            console.log('   2. ❌ Capacity constraint diabaikan dalam merge logic');
            console.log('   3. ❌ Semua stores terlalu dekat → savings selalu positif → dipaksakan merge');
            console.log('\n   💡 SOLUSI:');
            console.log('   - Periksa kondisi merge: routeFrom.load + routeTo.load <= vehicleCapacity');
            console.log('   - Tambahkan log di setiap merge untuk debug');
            console.log('   - Coba dengan capacity lebih kecil untuk test');
        } else if (calculatedTrips.length < Math.ceil(totalDemand / DEFAULT_CAPACITY)) {
            console.log('   ⚠️  WARNING: Jumlah rute kurang dari teoritis minimal!');
            console.log(`   Rute dibuat: ${calculatedTrips.length}`);
            console.log(`   Rute minimal: ${Math.ceil(totalDemand / DEFAULT_CAPACITY)}`);
        } else {
            console.log('   ✅ Jumlah rute sesuai dengan kapasitas');
            console.log(`   Rute dibuat: ${calculatedTrips.length}`);
            console.log(`   Rute minimal: ${Math.ceil(totalDemand / DEFAULT_CAPACITY)}`);
        }
        
        // 8. Cek lokasi stores
        console.log('\n\n7. ANALISIS JARAK ANTAR STORES:');
        const distances = [];
        for (let i = 0; i < stores.length; i++) {
            for (let j = i + 1; j < stores.length; j++) {
                const dist = getDistance(stores[i].location, stores[j].location);
                distances.push({
                    from: stores[i].storeName,
                    to: stores[j].storeName,
                    distance: dist
                });
            }
        }
        distances.sort((a, b) => a.distance - b.distance);
        
        console.log('   Jarak terdekat antar stores:');
        distances.slice(0, 5).forEach(d => {
            console.log(`   - ${d.from} ↔ ${d.to}: ${d.distance.toFixed(2)} km`);
        });
        
        const avgDistance = distances.reduce((sum, d) => sum + d.distance, 0) / distances.length;
        console.log(`\n   Rata-rata jarak: ${avgDistance.toFixed(2)} km`);
        
        console.log('\n=== SELESAI ===');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

debugRoutes();
