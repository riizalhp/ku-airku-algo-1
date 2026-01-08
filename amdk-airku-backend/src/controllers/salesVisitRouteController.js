const Visit = require('../models/visitModel');
const SalesVisitRoute = require('../models/salesVisitRouteModel');
const { calculateSavingsMatrixRoutes } = require('../services/routingService');
const { getDistance } = require('../utils/geolocation');

const createSalesVisitPlan = async (req, res) => {
    const { salesPersonId: requestedSalesPersonId, visitDate } = req.body;
    const { id: requesterId, role: requesterRole } = req.user;

    if (!visitDate) {
        return res.status(400).json({ message: "Tanggal kunjungan wajib diisi." });
    }

    const salesPersonId = (requesterRole === 'Admin' && requestedSalesPersonId) ? requestedSalesPersonId : requesterId;

    try {
        const upcomingVisits = await Visit.getUpcomingBySalesAndDate(salesPersonId, visitDate);
        if (upcomingVisits.length === 0) {
            return res.status(404).json({ message: "Tidak ada kunjungan yang dijadwalkan untuk sales ini pada tanggal tersebut." });
        }

        const nodes = upcomingVisits.map(visit => ({
            id: visit.id,
            location: visit.location,
            demand: 0, // Visits have no capacity demand
        }));

        const depotLocation = { lat: -7.8664161, lng: 110.1486773 }; // PDAM
        const MAX_STOPS_PER_ROUTE = 8; // Sales visit bisa lebih banyak stops
        const calculatedTrips = calculateSavingsMatrixRoutes(nodes, depotLocation, Infinity, MAX_STOPS_PER_ROUTE); // Infinity capacity

        if (calculatedTrips.length === 0 || calculatedTrips[0].length === 0) {
            return res.status(500).json({ message: "Gagal membuat rencana rute kunjungan." });
        }

        const sequence = calculatedTrips[0];
        const stops = sequence.map(visitId => {
            const visitData = upcomingVisits.find(v => v.id === visitId);
            return {
                visitId: visitData.id,
                storeId: visitData.storeId,
                storeName: visitData.storeName,
                address: visitData.address,
                purpose: visitData.purpose,
                location: visitData.location,
            };
        });

        const newPlan = await SalesVisitRoute.create({ salesPersonId, date: visitDate, stops });
        res.status(201).json({ success: true, message: 'Rencana rute kunjungan berhasil dibuat.', plan: newPlan });

    } catch (error) {
        console.error('Error creating sales visit route plan:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const getSalesVisitPlans = async (req, res) => {
    try {
        let plans;
        if (req.user.role === 'Admin') {
            plans = await SalesVisitRoute.getAll();
        } else {
            plans = await SalesVisitRoute.getBySalesPersonId(req.user.id);
        }

        // --- Calculate distances for each stop ---
        const depotLocation = { lat: -7.8664161, lng: 110.1486773 }; // PDAM Tirta Binangun
        const plansWithDistances = plans.map(plan => {
            let lastLocation = depotLocation;
            const stopsWithDistances = plan.stops.map(stop => {
                const distance = getDistance(lastLocation, stop.location);
                lastLocation = stop.location;
                return { ...stop, distanceFromPrev: distance }; // Add distance in KM
            });
            return { ...plan, stops: stopsWithDistances };
        });

        res.json(plansWithDistances);
    } catch (error) {
        console.error('Error getting sales visit plans:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const deleteSalesVisitPlan = async (req, res) => {
    try {
        const plan = await SalesVisitRoute.getById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Rencana kunjungan tidak ditemukan.' });
        }

        const success = await SalesVisitRoute.delete(req.params.id);
        if (success) {
            res.json({ message: 'Rencana kunjungan berhasil dihapus.' });
        } else {
            res.status(500).json({ message: 'Gagal menghapus rencana kunjungan.' });
        }
    } catch (error) {
        console.error('Error deleting sales visit plan:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = {
    createSalesVisitPlan,
    getSalesVisitPlans,
    deleteSalesVisitPlan
};