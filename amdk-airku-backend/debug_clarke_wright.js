/**
 * Debug Clarke-Wright Savings Matrix Algorithm Step-by-Step
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Haversine distance
function getDistance(coord1, coord2) {
    const R = 6371;
    const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
    const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * (Math.PI / 180)) *
        Math.cos(coord2.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Clarke-Wright with detailed logging
function calculateSavingsMatrixRoutesDebug(nodes, depotLocation, vehicleCapacity) {
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('🔍 CLARKE-WRIGHT SAVINGS MATRIX - DETAILED DEBUG');
    console.log('══════════════════════════════════════════════════════════');
    
    if (!nodes || nodes.length === 0) {
        console.log('❌ No nodes provided');
        return [];
    }

    console.log(`\n📊 INPUT DATA:`);
    console.log(`   Nodes: ${nodes.length}`);
    console.log(`   Vehicle Capacity: ${vehicleCapacity} units`);
    console.log(`   Depot: (${depotLocation.lat.toFixed(4)}, ${depotLocation.lng.toFixed(4)})`);
    
    // List all nodes
    console.log(`\n📍 NODES DETAIL:`);
    nodes.forEach((node, idx) => {
        console.log(`   ${idx+1}. ${node.id.substring(0, 8)} - Demand: ${node.demand} units, Location: (${node.location.lat.toFixed(4)}, ${node.location.lng.toFixed(4)})`);
    });

    // STEP 1: Calculate savings
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`STEP 1: CALCULATE SAVINGS FOR ALL PAIRS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const savings = [];
    let pairCount = 0;
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i];
            const nodeB = nodes[j];
            const distADepot = getDistance(nodeA.location, depotLocation);
            const distBDepot = getDistance(nodeB.location, depotLocation);
            const distAB = getDistance(nodeA.location, nodeB.location);
            const saving = distADepot + distBDepot - distAB;
            
            savings.push({
                from: nodeA.id,
                to: nodeB.id,
                fromName: i,
                toName: j,
                d0i: distADepot,
                d0j: distBDepot,
                dij: distAB,
                saving,
            });
            pairCount++;
        }
    }

    console.log(`\n   Total pairs calculated: ${pairCount}`);
    console.log(`\n   Top 10 highest savings:`);
    
    // Sort and show top savings
    const sortedSavings = [...savings].sort((a, b) => b.saving - a.saving);
    sortedSavings.slice(0, 10).forEach((s, idx) => {
        console.log(`   ${idx+1}. Pair ${s.fromName}-${s.toName}: S = ${s.d0i.toFixed(2)} + ${s.d0j.toFixed(2)} - ${s.dij.toFixed(2)} = ${s.saving.toFixed(2)} km`);
    });

    // STEP 2: Sort all savings
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`STEP 2: SORT SAVINGS (DESCENDING)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    savings.sort((a, b) => b.saving - a.saving);
    console.log(`   ✅ Sorted ${savings.length} pairs by saving value`);

    // STEP 3: Initialize routes
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`STEP 3: INITIALIZE ROUTES (ONE PER NODE)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const routes = nodes.map(node => ({
        path: [node.id],
        pathName: [nodes.indexOf(node)],
        load: node.demand,
    }));

    console.log(`\n   Created ${routes.length} initial routes (one per node):`);
    routes.forEach((r, idx) => {
        console.log(`   Route ${idx+1}: [${r.pathName.join('-')}] Load: ${r.load} units`);
    });

    // STEP 4: Merge routes based on savings
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`STEP 4: MERGE ROUTES BASED ON SAVINGS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    let mergeCount = 0;
    let rejectedCount = 0;
    
    for (const { from, to, fromName, toName, saving } of savings) {
        if (saving <= 0) {
            console.log(`\n   ⚠️  Savings <= 0. Stopping merge process.`);
            break;
        }

        const routeFrom = routes.find(r => r.path.includes(from));
        const routeTo = routes.find(r => r.path.includes(to));

        if (!routeFrom || !routeTo) continue;

        // Only merge if they are in different routes
        if (routeFrom !== routeTo) {
            const isFromEndpoint = routeFrom.path[0] === from || routeFrom.path[routeFrom.path.length - 1] === from;
            const isToEndpoint = routeTo.path[0] === to || routeTo.path[routeTo.path.length - 1] === to;

            // Check if nodes are endpoints
            if (isFromEndpoint && isToEndpoint) {
                // Check capacity constraint
                const totalLoad = routeFrom.load + routeTo.load;
                if (totalLoad <= vehicleCapacity) {
                    // MERGE!
                    mergeCount++;
                    
                    // Perform merge
                    if (routeFrom.path[routeFrom.path.length - 1] === from) {
                        routeFrom.path.reverse();
                        routeFrom.pathName.reverse();
                    }
                    if (routeTo.path[0] === to) {
                        routeTo.path.reverse();
                        routeTo.pathName.reverse();
                    }

                    const newPath = [...routeTo.path, ...routeFrom.path];
                    const newPathName = [...routeTo.pathName, ...routeFrom.pathName];
                    const newLoad = totalLoad;

                    console.log(`\n   ✅ MERGE #${mergeCount}: Pair ${fromName}-${toName} (Saving: ${saving.toFixed(2)} km)`);
                    console.log(`      Route From: [${routeFrom.pathName.join('-')}] (Load: ${routeFrom.load})`);
                    console.log(`      Route To:   [${routeTo.pathName.join('-')}] (Load: ${routeTo.load})`);
                    console.log(`      Result:     [${newPathName.join('-')}] (Load: ${newLoad})`);
                    
                    routeFrom.path = newPath;
                    routeFrom.pathName = newPathName;
                    routeFrom.load = newLoad;
                    
                    routeTo.path = [];
                    routeTo.pathName = [];
                    routeTo.load = 0;
                } else {
                    rejectedCount++;
                    console.log(`\n   ❌ REJECT: Pair ${fromName}-${toName} - Capacity exceeded (${routeFrom.load} + ${routeTo.load} = ${totalLoad} > ${vehicleCapacity})`);
                }
            }
        }
    }

    console.log(`\n   Summary: ${mergeCount} merges successful, ${rejectedCount} rejected`);

    // STEP 5: Filter and return
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`STEP 5: FINAL ROUTES`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const finalRoutes = routes.filter(r => r.path.length > 0);
    
    console.log(`\n   Total Routes: ${finalRoutes.length}\n`);
    
    finalRoutes.forEach((r, idx) => {
        console.log(`   Route ${idx+1}: [${r.pathName.join('-')}]`);
        console.log(`      Nodes: ${r.pathName.map(i => `${i}(${nodes[i].demand}u)`).join(' → ')}`);
        console.log(`      Total Load: ${r.load} units`);
        console.log(`      Capacity: ${vehicleCapacity} units`);
        console.log(`      Utilization: ${(r.load / vehicleCapacity * 100).toFixed(1)}%`);
    });

    console.log(`\n══════════════════════════════════════════════════════════`);
    
    return finalRoutes.map(r => r.path);
}

async function debug() {
    try {
        // Get data
        const deliveryDate = '2026-01-11';
        
        const { data: orders } = await supabase
            .from('orders')
            .select('id, store_id')
            .eq('desired_delivery_date', deliveryDate);
        
        if (!orders || orders.length === 0) {
            console.log('❌ No orders found');
            return;
        }
        
        const storeIds = [...new Set(orders.map(o => o.store_id))];
        console.log('Store IDs:', storeIds.length);
        
        const { data: stores } = await supabase
            .from('stores')
            .select('id, name, location, region');
        
        console.log('All stores:', stores?.length || 0);
        
        if (!stores || stores.length === 0) {
            console.log('❌ No stores found');
            return;
        }
        
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('order_id, product_id, quantity, products(capacity_unit, capacity_conversion_heterogeneous)')
            .in('order_id', orders.map(o => o.id));
        
        const itemsByOrderId = (orderItems || []).reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
        }, {});
        
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
        
        const storeMap = stores.reduce((acc, s) => {
            acc[s.id] = s;
            return acc;
        }, {});
        
        // Group by store
        const storeOrders = {};
        orders.forEach(order => {
            if (!storeOrders[order.store_id]) {
                const store = storeMap[order.store_id];
                storeOrders[order.store_id] = {
                    location: { lat: store.lat, lng: store.lng },
                    demand: 0
                };
            }
            const items = itemsByOrderId[order.id] || [];
            storeOrders[order.store_id].demand += calculateDemand(items);
        });
        
        // Create nodes
        const nodes = Object.entries(storeOrders).map(([storeId, data], idx) => ({
            id: storeId,
            location: data.location,
            demand: data.demand
        }));
        
        // Run debug
        const depotLocation = { lat: -7.8664161, lng: 110.1486773 };
        const capacity = 200;
        
        const result = calculateSavingsMatrixRoutesDebug(nodes, depotLocation, capacity);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

debug();
