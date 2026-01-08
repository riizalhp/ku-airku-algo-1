const Shipment = require('../models/shipmentModel');
const Order = require('../models/orderModel');
const Store = require('../models/storeModel');
const Route = require('../models/routeModel');
const Vehicle = require('../models/vehicleModel');
const User = require('../models/userModel');
const { calculateSavingsMatrixRoutes } = require('../services/routingService');

const getShipments = async (req, res) => {
    try {
        const filters = { ...req.query };
        const shipments = await Shipment.getAll(filters);
        res.json(shipments);
    } catch (error) {
        console.error('Error getting shipments:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const getShipmentById = async (req, res) => {
    try {
        const shipment = await Shipment.getById(req.params.id);
        if (shipment) {
            res.json(shipment);
        } else {
            res.status(404).json({ message: 'Shipment tidak ditemukan.' });
        }
    } catch (error) {
        console.error(`Error getting shipment ${req.params.id}:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const createShipment = async (req, res) => {
    const { name, date, region } = req.body;

    if (!name || !date) {
        return res.status(400).json({ message: 'Nama dan tanggal wajib diisi.' });
    }

    try {
        const newShipment = await Shipment.create({ name, date, region });
        res.status(201).json(newShipment);
    } catch (error) {
        console.error('Error creating shipment:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const addOrderToShipment = async (req, res) => {
    const { id: shipmentId } = req.params;
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ message: 'Order ID wajib diisi.' });
    }

    try {
        // Validate shipment exists
        const shipment = await Shipment.getById(shipmentId);
        if (!shipment) {
            return res.status(404).json({ message: 'Shipment tidak ditemukan.' });
        }

        // Validate order exists and is pending
        const order = await Order.getById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Pesanan tidak ditemukan.' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ 
                message: `Pesanan dengan status '${order.status}' tidak dapat ditambahkan ke muatan.` 
            });
        }

        // Check if shipment is still unassigned
        if (shipment.status !== 'unassigned') {
            return res.status(400).json({ 
                message: 'Tidak dapat menambahkan pesanan ke muatan yang sudah ditugaskan.' 
            });
        }

        // ===== REGION VALIDATION: Ensure all orders in shipment are from same region =====
        if (shipment.orders.length > 0) {
            // Get store info for the new order
            const newOrderStore = await Store.getById(order.storeId);
            if (!newOrderStore) {
                return res.status(404).json({ message: 'Toko untuk pesanan tidak ditemukan.' });
            }
            
            // Get store info for existing orders in shipment
            const existingOrder = shipment.orders[0];
            const existingStore = await Store.getById(existingOrder.storeId);
            
            if (existingStore && newOrderStore.region !== existingStore.region) {
                return res.status(400).json({ 
                    message: `Tidak dapat menambahkan pesanan dari wilayah "${newOrderStore.region}" ke muatan yang sudah berisi pesanan dari wilayah "${existingStore.region}". Satu muatan hanya boleh berisi pesanan dari wilayah yang sama.` 
                });
            }
        }

        await Shipment.addOrder(shipmentId, orderId);
        
        res.json({ 
            success: true, 
            message: 'Pesanan berhasil ditambahkan ke muatan.' 
        });
    } catch (error) {
        console.error(`Error adding order to shipment:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const removeOrderFromShipment = async (req, res) => {
    const { id: shipmentId, orderId } = req.params;

    try {
        const shipment = await Shipment.getById(shipmentId);
        if (!shipment) {
            return res.status(404).json({ message: 'Shipment tidak ditemukan.' });
        }

        if (shipment.status !== 'unassigned') {
            return res.status(400).json({ 
                message: 'Tidak dapat menghapus pesanan dari muatan yang sudah ditugaskan.' 
            });
        }

        await Shipment.removeOrder(shipmentId, orderId);
        
        res.json({ 
            success: true, 
            message: 'Pesanan berhasil dihapus dari muatan.' 
        });
    } catch (error) {
        console.error(`Error removing order from shipment:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const assignShipment = async (req, res) => {
    const { id: shipmentId } = req.params;
    const { vehicleId, driverId } = req.body;

    if (!vehicleId || !driverId) {
        return res.status(400).json({ message: 'Vehicle ID dan Driver ID wajib diisi.' });
    }

    try {
        // Validate shipment
        const shipment = await Shipment.getById(shipmentId);
        if (!shipment) {
            return res.status(404).json({ message: 'Shipment tidak ditemukan.' });
        }

        if (shipment.status !== 'unassigned') {
            return res.status(400).json({ message: 'Shipment sudah ditugaskan sebelumnya.' });
        }

        if (shipment.orders.length === 0) {
            return res.status(400).json({ message: 'Tidak dapat menugaskan muatan kosong.' });
        }

        // ===== REGION VALIDATION: Verify all orders are from same region =====
        const orderRegions = new Set();
        for (const order of shipment.orders) {
            const store = await Store.getById(order.storeId);
            if (store && store.region) {
                orderRegions.add(store.region);
            }
        }
        
        if (orderRegions.size > 1) {
            return res.status(400).json({ 
                message: `Shipment berisi pesanan dari ${orderRegions.size} wilayah berbeda (${Array.from(orderRegions).join(', ')}). Satu shipment hanya boleh berisi pesanan dari satu wilayah. Silakan pisahkan pesanan per wilayah.` 
            });
        }
        
        const shipmentRegion = orderRegions.size > 0 ? Array.from(orderRegions)[0] : 'Unknown';
        console.log(`[Shipment Assignment] All orders are from region: ${shipmentRegion}`);

        // Validate vehicle
        const vehicle = await Vehicle.getById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Armada tidak ditemukan.' });
        }

        if (vehicle.status !== 'Idle') {
            return res.status(400).json({ 
                message: `Armada ${vehicle.plateNumber} tidak idle dan tidak dapat ditugaskan.` 
            });
        }

        // Validate driver
        const driver = await User.getById(driverId);
        if (!driver || driver.role !== 'Driver') {
            return res.status(404).json({ message: 'Driver tidak ditemukan.' });
        }

        console.log(`[Shipment Assignment] Assigning shipment ${shipmentId} to driver ${driver.name} and vehicle ${vehicle.plateNumber}`);

        // Assign shipment
        await Shipment.assign(shipmentId, driverId, vehicleId);

        // Create route from shipment orders
        const orders = shipment.orders;
        const depotLocation = { lat: -7.8664161, lng: 110.1486773 }; // PDAM Tirta Binangun

        // Group orders by store
        const storeStops = orders.reduce((acc, order) => {
            if (!acc[order.storeId]) {
                acc[order.storeId] = {
                    storeId: order.storeId,
                    storeName: order.storeName,
                    address: order.address,
                    location: order.location,
                    totalDemand: 0,
                    orderIds: [],
                    priority: false,
                };
            }
            acc[order.storeId].totalDemand += order.demand || 0;
            acc[order.storeId].orderIds.push(order.id);
            if (order.priority) acc[order.storeId].priority = true;
            return acc;
        }, {});

        const nodes = Object.values(storeStops).map(store => ({
            id: store.storeId,
            location: store.location,
            demand: store.totalDemand,
            priority: store.priority,
        }));

        console.log(`[Shipment Assignment] Creating route with ${nodes.length} nodes`);

        // Generate optimized route using Clarke-Wright
        const MAX_STOPS_PER_ROUTE = 4; // Maksimal 4 stops per rute
        const calculatedTrips = calculateSavingsMatrixRoutes(nodes, depotLocation, vehicle.capacity, MAX_STOPS_PER_ROUTE);
        
        console.log(`[Shipment Assignment] Generated ${calculatedTrips.length} trips`);

        // Create route plan (should only be 1 trip for 1 shipment)
        let createdRoute = null;
        
        if (calculatedTrips.length > 0) {
            const tripStoreIds = calculatedTrips[0]; // Take first trip
            const stopsForThisTrip = [];

            for (const storeId of tripStoreIds) {
                const storeData = storeStops[storeId];
                if (storeData) {
                    storeData.orderIds.forEach(orderId => {
                        const orderData = orders.find(o => o.id === orderId);
                        if (orderData) {
                            stopsForThisTrip.push({
                                orderId: orderData.id,
                                storeId: orderData.storeId,
                                storeName: orderData.storeName,
                                address: orderData.address,
                                location: orderData.location
                            });
                        }
                    });
                }
            }

            if (stopsForThisTrip.length > 0) {
                const newRoutePlan = {
                    driverId,
                    vehicleId,
                    date: shipment.date,
                    stops: stopsForThisTrip,
                    assignmentStatus: 'assigned'
                };

                createdRoute = await Route.createPlan(newRoutePlan);
                console.log(`[Shipment Assignment] Route plan created: ${createdRoute.id}`);

                // Link route to shipment
                await Shipment.linkRoutePlan(shipmentId, createdRoute.id);
            }
        }

        res.json({
            success: true,
            message: `Shipment berhasil ditugaskan ke ${driver.name} dengan armada ${vehicle.plateNumber}. Rute optimal telah dibuat.`,
            routePlan: createdRoute
        });

    } catch (error) {
        console.error(`Error assigning shipment:`, error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server.' });
    }
};

const deleteShipment = async (req, res) => {
    const { id: shipmentId } = req.params;

    try {
        const shipment = await Shipment.getById(shipmentId);
        if (!shipment) {
            return res.status(404).json({ message: 'Shipment tidak ditemukan.' });
        }

        if (shipment.status !== 'unassigned') {
            return res.status(400).json({ 
                message: 'Tidak dapat menghapus shipment yang sudah ditugaskan. Batalkan penugasan terlebih dahulu.' 
            });
        }

        const success = await Shipment.delete(shipmentId);
        
        if (success) {
            res.json({ message: 'Shipment berhasil dihapus dan pesanan dikembalikan ke status pending.' });
        } else {
            res.status(500).json({ message: 'Gagal menghapus shipment.' });
        }
    } catch (error) {
        console.error(`Error deleting shipment:`, error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = {
    getShipments,
    getShipmentById,
    createShipment,
    addOrderToShipment,
    removeOrderFromShipment,
    assignShipment,
    deleteShipment
};
