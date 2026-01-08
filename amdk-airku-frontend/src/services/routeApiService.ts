import { supabase } from '../lib/supabaseClient';
import { RoutePlan, SalesVisitRoutePlan } from '../types';

// --- Delivery Routes ---
export const getDeliveryRoutes = async (filters: { driverId?: string, date?: string } = {}): Promise<RoutePlan[]> => {
    let query = supabase.from('route_plans').select(`
        *,
        driver:driver_id(id, name),
        vehicle:vehicle_id(id, plate_number),
        stops:route_stops(
            *,
            store:store_id(name, address, location)
        )
    `);

    if (filters.driverId) query = query.eq('driver_id', filters.driverId);
    if (filters.date) query = query.eq('date', filters.date);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((r: any) => ({
        id: r.id,
        driverId: r.driver_id,
        vehicleId: r.vehicle_id,
        driverName: r.driver?.name || 'N/A',
        vehiclePlate: r.vehicle?.plate_number || 'N/A',
        date: r.date,
        region: r.region,
        assignmentStatus: r.assignment_status,
        stops: (r.stops || []).map((s: any) => ({
            id: s.id,
            orderId: s.order_id,
            storeId: s.store_id,
            storeName: s.store?.name,
            address: s.store?.address,
            location: s.store?.location,
            status: s.status,
            proofOfDeliveryImage: s.proof_of_delivery_image,
            failureReason: s.failure_reason,
            distanceFromPrev: s.distance_from_prev
        }))
    }));
};

export const createDeliveryRoute = async (payload: { deliveryDate: string, assignments: { vehicleId: string, driverId: string }[], selectedOrderIds?: string[] }): Promise<{ success: boolean, message: string, routes: RoutePlan[] }> => {
    const createdRoutes: RoutePlan[] = [];
    const assignments = (payload.assignments && payload.assignments.length > 0)
        ? payload.assignments
        : [{ vehicleId: null, driverId: null }];

    let ordersToRoute: any[] = [];
    // 1. Determine orders
    if (payload.selectedOrderIds && payload.selectedOrderIds.length > 0) {
        const { data } = await supabase.from('orders').select('id, store_id').in('id', payload.selectedOrderIds);
        ordersToRoute = data || [];
    } else if (payload.assignments.length === 0) {
        // Auto-fetch all pending if no assignments provided
        const { data } = await supabase.from('orders').select('id, store_id').eq('status', 'Pending');
        ordersToRoute = data || [];
    }

    if (payload.assignments.length === 0 && ordersToRoute.length === 0) {
        return { success: false, message: 'Tidak ada pesanan pending.', routes: [] };
    }

    // 2. Create Routes
    for (const assignment of assignments) {
        // If driver/vehicle are null (coercing explicit null from the placeholder above), it's 'unassigned'
        const isUnassigned = !assignment.vehicleId || !assignment.driverId;

        // Use 'null' for Supabase if the string is empty or null
        const vId = assignment.vehicleId || null;
        const dId = assignment.driverId || null;

        const { data: route, error } = await supabase.from('route_plans').insert({
            date: payload.deliveryDate,
            vehicle_id: vId,
            driver_id: dId,
            assignment_status: isUnassigned ? 'unassigned' : 'assigned'
        }).select().single();

        if (error) throw new Error(error.message);
        createdRoutes.push(route as any);

        // 3. Add Stops to the first suitable route (simple logic for now)
        // If we have multiple assignments, this logic currently only dumps orders into the *first* one loop hits if we don't clear ordersToRoute.
        // But since we want to assign ALL found pending orders to the "Unassigned" route created in the auto-flow, this works.
        if (ordersToRoute.length > 0) {
            const orderIds = ordersToRoute.map(o => o.id);
            await supabase.from('orders').update({
                assigned_vehicle_id: vId,
                status: 'Routed'
            }).in('id', orderIds);

            const stopsData = ordersToRoute.map((order, idx) => ({
                route_plan_id: route.id,
                order_id: order.id,
                store_id: order.store_id,
                sequence: idx + 1,
                status: 'Pending'
            }));

            const { error: stopsError } = await supabase.from('route_stops').insert(stopsData);
            if (stopsError) console.error('Error creating stops', stopsError);

            // Send notification to driver if assigned
            if (!isUnassigned && dId) {
                try {
                    await supabase.from('driver_notifications').insert({
                        driver_id: dId,
                        route_id: route.id,
                        message: `Rute pengiriman baru untuk ${payload.deliveryDate}: ${ordersToRoute.length} pesanan`,
                        type: 'new_route',
                        created_at: new Date().toISOString()
                    });
                } catch (err) {
                    console.error('Failed to send driver notification:', err);
                }
            }

            // Important: Clear orders so we don't add them again if there are multiple assignments (though usually auto-flow has 1)
            ordersToRoute = [];
        }
    }

    return { success: true, message: 'Rute berhasil dibuat.', routes: createdRoutes };
};

export const deleteDeliveryRoute = async (routeId: string): Promise<void> => {
    try {
        console.log('[Delete Route] Starting deletion for route:', routeId);
        
        // Get stops for this route
        const { data: stops, error: stopsQueryError } = await supabase
            .from('route_stops')
            .select('order_id')
            .eq('route_plan_id', routeId); // Changed from 'route_id' to 'route_plan_id'
        
        if (stopsQueryError) {
            console.error('[Delete Route] Error querying stops:', stopsQueryError);
            throw new Error(`Gagal mengambil data stops: ${stopsQueryError.message}`);
        }
        
        console.log('[Delete Route] Found stops:', stops?.length || 0);
        
        // Update orders back to Pending
        if (stops && stops.length > 0) {
            const orderIds = stops.map(s => s.order_id);
            console.log('[Delete Route] Updating orders to Pending:', orderIds);
            
            const { error: ordersUpdateError } = await supabase
                .from('orders')
                .update({ status: 'Pending', assigned_vehicle_id: null })
                .in('id', orderIds);
            
            if (ordersUpdateError) {
                console.error('[Delete Route] Error updating orders:', ordersUpdateError);
                throw new Error(`Gagal mengupdate status pesanan: ${ordersUpdateError.message}`);
            }
        }
        
        // Delete the route (cascade will delete route_stops automatically if FK is set)
        console.log('[Delete Route] Deleting route plan...');
        const { error: deleteError } = await supabase
            .from('route_plans')
            .delete()
            .eq('id', routeId);
        
        if (deleteError) {
            console.error('[Delete Route] Error deleting route:', deleteError);
            throw new Error(`Gagal menghapus rute: ${deleteError.message}`);
        }
        
        console.log('[Delete Route] Successfully deleted route:', routeId);
    } catch (error: any) {
        console.error('[Delete Route] Fatal error:', error);
        throw error; // Re-throw to be caught by mutation onError
    }
};

export const assignDriverVehicle = async (payload: { routeId: string, vehicleId: string, driverId: string }): Promise<{ success: boolean, message: string }> => {
    const { error } = await supabase.from('route_plans').update({
        vehicle_id: payload.vehicleId,
        driver_id: payload.driverId,
        assignment_status: 'assigned'
    }).eq('id', payload.routeId);
    if (error) throw new Error(error.message);
    return { success: true, message: 'Assigned successfully' };
};

export const unassignDriverVehicle = async (routeId: string): Promise<{ success: boolean, message: string }> => {
    const { error } = await supabase.from('route_plans').update({
        vehicle_id: null,
        driver_id: null,
        assignment_status: 'unassigned'
    }).eq('id', routeId);
    if (error) throw new Error(error.message);
    return { success: true, message: 'Unassigned successfully' };
};

export const updateDeliveryStopStatus = async (payload: { stopId: string, status: 'Completed' | 'Failed', proofImage?: string, failureReason?: string }): Promise<void> => {
    const { error } = await supabase.from('route_stops').update({
        status: payload.status,
        proof_of_delivery_image: payload.proofImage,
        failure_reason: payload.failureReason
    }).eq('id', payload.stopId);
    if (error) throw new Error(error.message);
};

export const startOrCompleteTrip = async (vehicleId: string, action: 'start' | 'complete'): Promise<void> => {
    const status = action === 'start' ? 'Sedang Mengirim' : 'Idle';
    await supabase.from('vehicles').update({ status }).eq('id', vehicleId);
};

export const moveOrder = async (payload: { orderId: string, newVehicleId: string | null }): Promise<void> => {
    // Update order status dan assigned vehicle
    const updateData: any = { 
        assigned_vehicle_id: payload.newVehicleId 
    };
    
    // Jika newVehicleId null, kembalikan status ke Pending
    if (payload.newVehicleId === null) {
        updateData.status = 'Pending';
        
        // Hapus order dari route stops di semua routes
        const { error: deleteError } = await supabase
            .from('route_stops')
            .delete()
            .eq('order_id', payload.orderId);
        
        if (deleteError) {
            console.error('Error deleting route stops:', deleteError);
            throw new Error('Gagal menghapus order dari route stops');
        }
    } else {
        updateData.status = 'Routed';
    }
    
    // Update order
    const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', payload.orderId);
    
    if (updateError) {
        console.error('Error updating order:', updateError);
        throw new Error('Gagal mengubah status order');
    }
};

// --- Sales Visit Routes ---
export const getSalesRoutes = async (filters: { salesPersonId?: string, date?: string } = {}): Promise<SalesVisitRoutePlan[]> => {
    let query = supabase.from('sales_visit_route_plans').select(`
        *,
        stops:sales_visit_route_stops(
            *,
            store:store_id(name, address, location)
        )
    `);

    if (filters.salesPersonId) query = query.eq('sales_person_id', filters.salesPersonId);
    if (filters.date) query = query.eq('date', filters.date);
    // Sort by newest
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Map manually to ensure type safety
    return (data || []).map((r: any) => ({
        id: r.id,
        salesPersonId: r.sales_person_id,
        date: r.date,
        stops: (r.stops || []).map((s: any) => ({
            id: s.id,
            visitId: s.visit_id,
            storeId: s.store_id,
            storeName: s.store?.name || s.store_name, // Fallback
            address: s.store?.address || s.address, // Fallback
            purpose: s.purpose,
            status: s.status,
            proofOfVisitImage: s.proof_of_visit_image,
            notes: s.notes
        }))
    }));
};

export const createSalesRoute = async (payload: { salesPersonId: string, visitDate: string, stops: { storeId: string, purpose: string }[] }): Promise<{ success: boolean, message: string }> => {
    // 1. Create Header
    const { data: plan, error } = await supabase.from('sales_visit_route_plans').insert({
        sales_person_id: payload.salesPersonId,
        date: payload.visitDate
    }).select().single();
    if (error) throw new Error(error.message);

    // 2. Create Stops
    if (payload.stops && payload.stops.length > 0) {
        // Fetch store details for caching (optional, but good for robust history)
        // For now, just link ID
        const stopsData = payload.stops.map((stop, idx) => ({
            route_id: plan.id,
            store_id: stop.storeId,
            purpose: stop.purpose,
            sequence: idx + 1,
            status: 'Akan Datang'
        }));

        const { error: stopsError } = await supabase.from('sales_visit_route_stops').insert(stopsData);
        if (stopsError) throw new Error(stopsError.message);
    }
    return { success: true, message: 'Rute kunjungan berhasil dibuat' };
};

export const deleteSalesRoute = async (routeId: string): Promise<void> => {
    const { error } = await supabase.from('sales_visit_route_plans').delete().eq('id', routeId);
    if (error) throw new Error(error.message);
};
