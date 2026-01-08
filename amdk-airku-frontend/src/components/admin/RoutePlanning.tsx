import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { Role, RoutePlan, Vehicle, VehicleStatus, SalesVisitRoutePlan, User } from '../../types';
import { ICONS } from '../../constants';
import { Modal } from '../ui/Modal';
import { getVehicles } from '../../services/vehicleApiService';
import { getUsers } from '../../services/userApiService';
import { createDeliveryRoute, getDeliveryRoutes, deleteDeliveryRoute, assignDriverVehicle, createSalesRoute, getSalesRoutes, deleteSalesRoute } from '../../services/routeApiService';
import { getDistance } from '../../utils/geolocation'; // Import getDistance from frontend utils

type PlanningTab = 'delivery' | 'salesVisit';

const getStatusClass = (status: VehicleStatus) => {
    switch (status) {
        case VehicleStatus.IDLE: return 'bg-green-100 text-green-800';
        case VehicleStatus.DELIVERING: return 'bg-blue-100 text-blue-800';
        case VehicleStatus.REPAIR: return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const RoutePlanning: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<PlanningTab>('delivery');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [expandedRouteIds, setExpandedRouteIds] = useState<string[]>([]);
    const [selectedRouteForAssignment, setSelectedRouteForAssignment] = useState<RoutePlan | null>(null);

    // --- Data Fetching ---
    const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers });
    const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ['vehicles'], queryFn: getVehicles });
    const { data: deliveryRoutes = [], isLoading: isLoadingDelivery } = useQuery<RoutePlan[]>({ queryKey: ['deliveryRoutes'], queryFn: () => getDeliveryRoutes(), enabled: activeTab === 'delivery' });
    const { data: salesRoutes = [], isLoading: isLoadingSales } = useQuery<SalesVisitRoutePlan[]>({ queryKey: ['salesRoutes'], queryFn: () => getSalesRoutes(), enabled: activeTab === 'salesVisit' });

    // --- Delivery Planning ---
    const [deliveryForm, setDeliveryForm] = useState({ date: new Date().toISOString().split('T')[0] });
    const [assignmentForm, setAssignmentForm] = useState({ vehicleId: '', driverId: '' });

    const createDeliveryMutation = useMutation({
        mutationFn: createDeliveryRoute,
        onSuccess: (data) => {
            alert(data.message);
            queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            setIsModalOpen(false);
            setDeliveryForm({ date: new Date().toISOString().split('T')[0] });
        },
        onError: (err: any) => {
            console.error('[Create Route Mutation] Error:', err);
            const errorMessage = err?.message || err?.response?.data?.message || 'Gagal membuat rute. Silakan coba lagi.';
            setModalError(errorMessage);
        },
    });

    const assignDriverVehicleMutation = useMutation({
        mutationFn: assignDriverVehicle,
        onSuccess: (data) => {
            alert(data.message || 'Driver dan armada berhasil di-assign!');
            queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            setIsAssignModalOpen(false);
            setSelectedRouteForAssignment(null);
            setAssignmentForm({ vehicleId: '', driverId: '' });
        },
        onError: (err: any) => {
            console.error('[Assign Driver Mutation] Error:', err);
            const errorMessage = err?.message || err?.response?.data?.message || 'Gagal meng-assign driver dan armada.';
            setModalError(errorMessage);
        },
    });

    const deleteDeliveryMutation = useMutation({
        mutationFn: deleteDeliveryRoute,
        onSuccess: () => {
            alert('Perjalanan berhasil dihapus/dibatalkan.');
            queryClient.invalidateQueries({ queryKey: ['deliveryRoutes'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (err: any) => {
            console.error('[Delete Route Mutation] Error:', err);
            const errorMessage = err?.message || err?.response?.data?.message || 'Gagal menghapus rute. Silakan coba lagi.';
            alert(errorMessage);
        },
    });

    const handleCreateDeliveryPlan = () => {
        setModalError(null);
        if (!deliveryForm.date) {
            setModalError("Harap pilih tanggal pengiriman.");
            return;
        }
        // Buat rute TANPA driver dan vehicle
        createDeliveryMutation.mutate({
            deliveryDate: deliveryForm.date,
            assignments: [] // Tidak ada assignment
        });
    };

    const handleOpenAssignModal = (route: RoutePlan) => {
        setSelectedRouteForAssignment(route);
        setAssignmentForm({ vehicleId: '', driverId: '' });
        setModalError(null);
        setIsAssignModalOpen(true);
    };

    const handleAssignDriverVehicle = () => {
        setModalError(null);
        if (!assignmentForm.vehicleId || !assignmentForm.driverId) {
            setModalError("Harap pilih driver dan armada.");
            return;
        }
        if (!selectedRouteForAssignment) return;

        assignDriverVehicleMutation.mutate({
            routeId: selectedRouteForAssignment.id,
            vehicleId: assignmentForm.vehicleId,
            driverId: assignmentForm.driverId,
        });
    };

    const handleDeleteDeliveryTrip = (tripId: string) => {
        if (window.confirm("Anda yakin ingin menghapus/membatalkan perjalanan ini? Pesanan akan dikembalikan ke status 'Pending'.")) {
            deleteDeliveryMutation.mutate(tripId);
        }
    };

    // --- Sales Visit Planning ---
    const [salesForm, setSalesForm] = useState({ salesPersonId: '', visitDate: new Date().toISOString().split('T')[0], stops: [] });

    const createSalesMutation = useMutation({
        mutationFn: createSalesRoute,
        onSuccess: (data) => {
            alert(data.message);
            queryClient.invalidateQueries({ queryKey: ['salesRoutes'] });
            setIsModalOpen(false);
        },
        onError: (err: any) => setModalError(err.response?.data?.message || 'Gagal membuat rute kunjungan.'),
    });

    const deleteSalesMutation = useMutation({
        mutationFn: deleteSalesRoute,
        onSuccess: () => {
            alert('Rencana kunjungan berhasil dihapus.');
            queryClient.invalidateQueries({ queryKey: ['salesRoutes'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Gagal menghapus rute.'),
    });

    const handleCreateSalesPlan = () => {
        setModalError(null);
        if (!salesForm.salesPersonId || !salesForm.visitDate) {
            setModalError("Harap pilih sales dan tanggal kunjungan.");
            return;
        }
        createSalesMutation.mutate(salesForm);
    };

    const toggleRouteExpansion = (routeId: string) => {
        setExpandedRouteIds(prev =>
            prev.includes(routeId)
                ? prev.filter(id => id !== routeId)
                : [...prev, routeId]
        );
    };

    // Memos
    const availableDrivers = useMemo(() => users.filter(u => u.role === Role.DRIVER), [users]);
    const availableSales = useMemo(() => users.filter(u => u.role === Role.SALES), [users]);

    // Group routes by assignment status
    const routesByStatus = useMemo(() => {
        const grouped: Record<string, RoutePlan[]> = {
            unassigned: [],
            assigned: [],
            departed: [],
            completed: []
        };

        deliveryRoutes.forEach(route => {
            const status = route.assignmentStatus || 'unassigned';
            if (grouped[status]) {
                grouped[status].push(route);
            }
        });

        // Sort each group by date (newest first)
        Object.keys(grouped).forEach(status => {
            grouped[status].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        return grouped;
    }, [deliveryRoutes]);

    const getAssignmentStatusBadge = (status: string) => {
        const badges = {
            unassigned: { text: 'Belum Di-assign', class: 'bg-yellow-100 text-yellow-800' },
            assigned: { text: 'Sudah Di-assign', class: 'bg-blue-100 text-blue-800' },
            departed: { text: 'Sudah Berangkat', class: 'bg-green-100 text-green-800' },
            completed: { text: 'Selesai', class: 'bg-gray-100 text-gray-800' },
        };
        return badges[status as keyof typeof badges] || badges.unassigned;
    };

    const sortedSalesRoutes = useMemo(() => {
        const depotLocation = { lat: -7.8664161, lng: 110.1486773 }; // PDAM Tirta Binangun

        return [...salesRoutes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(route => {
            // Calculate distances for sales visit routes
            const stopsWithDistances = route.stops.map((stop, index, array) => {
                const prevLocation = index === 0 ? depotLocation : array[index - 1].location;
                const distance = getDistance(prevLocation, stop.location);
                return { ...stop, distanceFromPrev: distance };
            });
            return { ...route, stops: stopsWithDistances };
        });
    }, [salesRoutes]);


    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold text-brand-dark">Perencanaan Rute</h1>
            <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-6"><button onClick={() => setActiveTab('delivery')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'delivery' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Rute Pengiriman</button><button onClick={() => setActiveTab('salesVisit')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'salesVisit' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Rute Kunjungan Sales</button></nav></div>

            <div className="mt-6">
                {activeTab === 'delivery' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-semibold">Rute Pengiriman Armada</h2>
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg">
                                <ICONS.plus /> Buat Rute Baru
                            </button>
                        </div>

                        <Card className="bg-blue-50 border border-blue-200">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 text-brand-primary pt-1">
                                    <ICONS.mapPin />
                                </div>
                                <div>
                                    <h3 className="text-md font-bold text-brand-dark">Flow Perencanaan Rute Baru</h3>
                                    <ol className="text-sm text-gray-700 mt-2 ml-4 list-decimal space-y-1">
                                        <li><strong>Buat Rute</strong> - Sistem akan membuat rute optimal dari pesanan pending</li>
                                        <li><strong>Assign Driver & Armada</strong> - Pilih driver dan kendaraan untuk rute</li>
                                        <li><strong>Berangkatkan</strong> - Ubah status menjadi "Sudah Berangkat"</li>
                                    </ol>
                                </div>
                            </div>
                        </Card>

                        {isLoadingDelivery ? (
                            <p>Memuat rute...</p>
                        ) : deliveryRoutes.length === 0 ? (
                            <Card><p className="text-center py-10 text-gray-500">Belum ada rute pengiriman. Klik "Buat Rute Baru" untuk memulai.</p></Card>
                        ) : (
                            <div className="space-y-6">
                                {/* Unassigned Routes */}
                                {routesByStatus.unassigned.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-bold pb-2 mb-4 border-b flex items-center gap-2">
                                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                                                {routesByStatus.unassigned.length}
                                            </span>
                                            Rute Belum Di-assign
                                        </h3>
                                        <div className="space-y-4">
                                            {routesByStatus.unassigned.map(route => (
                                                <Card key={route.id} className="border-l-4 border-yellow-500">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h4 className="text-lg font-bold text-brand-primary">
                                                                    Rute Tanggal: {new Date(route.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </h4>
                                                            </div>
                                                            <p className="text-sm text-gray-600">Wilayah: <strong>{route.region}</strong></p>
                                                            <p className="text-sm text-gray-600">Total Pemberhentian: <strong>{route.stops.length}</strong></p>
                                                            <p className="text-sm text-red-600 mt-2">⚠️ Belum ada driver dan armada yang di-assign</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getAssignmentStatusBadge(route.assignmentStatus).class}`}>
                                                                {getAssignmentStatusBadge(route.assignmentStatus).text}
                                                            </span>
                                                            <button
                                                                onClick={() => handleOpenAssignModal(route)}
                                                                className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition text-sm font-semibold"
                                                            >
                                                                Assign Driver & Armada
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteDeliveryTrip(route.id)}
                                                                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-sm font-semibold"
                                                            >
                                                                Hapus Rute
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleRouteExpansion(route.id)}
                                                        className="text-sm font-semibold text-gray-600 hover:underline mt-2"
                                                    >
                                                        {expandedRouteIds.includes(route.id) ? 'Sembunyikan Detail' : 'Lihat Detail Rute'}
                                                    </button>
                                                    {expandedRouteIds.includes(route.id) && (
                                                        <div className="mt-4 pl-4 border-l-2 border-brand-light space-y-3">
                                                            {route.stops.map((stop, index) => {
                                                                const depotLocation = { lat: -7.8664161, lng: 110.1486773 };
                                                                const prevLocation = index === 0 ? depotLocation : route.stops[index - 1].location;
                                                                const distance = getDistance(prevLocation, stop.location);
                                                                return (
                                                                    <div key={stop.id} className="relative pl-6">
                                                                        <div className="absolute left-0 top-1 w-5 h-5 bg-brand-secondary text-white text-xs rounded-full flex items-center justify-center font-mono">
                                                                            {index + 1}
                                                                        </div>
                                                                        <p className="font-semibold text-sm">{stop.storeName}</p>
                                                                        <p className="text-xs text-gray-500">{stop.address}</p>
                                                                        <p className="text-xs text-brand-dark font-semibold mt-1">
                                                                            Jarak: {distance.toFixed(2)} km
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Assigned Routes */}
                                {routesByStatus.assigned.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-bold pb-2 mb-4 border-b flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                                {routesByStatus.assigned.length}
                                            </span>
                                            Rute Sudah Di-assign (Siap Berangkat)
                                        </h3>
                                        <div className="space-y-4">
                                            {routesByStatus.assigned.map(route => {
                                                const driver = users.find(u => u.id === route.driverId);
                                                const vehicle = vehicles.find(v => v.id === route.vehicleId);
                                                return (
                                                    <Card key={route.id} className="border-l-4 border-blue-500">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <h4 className="text-lg font-bold text-brand-primary">
                                                                        {new Date(route.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                    </h4>
                                                                </div>
                                                                <p className="text-sm text-gray-600">Driver: <strong>{driver?.name || 'N/A'}</strong></p>
                                                                <p className="text-sm text-gray-600">Armada: <strong>{vehicle?.plateNumber || 'N/A'}</strong></p>
                                                                <p className="text-sm text-gray-600">Wilayah: <strong>{route.region}</strong></p>
                                                                <p className="text-sm text-gray-600">Total: <strong>{route.stops.length} pemberhentian</strong></p>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getAssignmentStatusBadge(route.assignmentStatus).class}`}>
                                                                    {getAssignmentStatusBadge(route.assignmentStatus).text}
                                                                </span>
                                                                {vehicle && (
                                                                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(vehicle.status)}`}>
                                                                        {vehicle.status}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                                                                >
                                                                    🚚 Berangkatkan
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDeliveryTrip(route.id)}
                                                                    className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-sm font-semibold"
                                                                >
                                                                    Batalkan
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleRouteExpansion(route.id)}
                                                            className="text-sm font-semibold text-gray-600 hover:underline mt-2"
                                                        >
                                                            {expandedRouteIds.includes(route.id) ? 'Sembunyikan Detail' : 'Lihat Detail Rute'}
                                                        </button>
                                                        {expandedRouteIds.includes(route.id) && (
                                                            <div className="mt-4 pl-4 border-l-2 border-brand-light space-y-3">
                                                                {route.stops.map((stop, index) => {
                                                                    const depotLocation = { lat: -7.8664161, lng: 110.1486773 };
                                                                    const prevLocation = index === 0 ? depotLocation : route.stops[index - 1].location;
                                                                    const distance = getDistance(prevLocation, stop.location);
                                                                    return (
                                                                        <div key={stop.id} className="relative pl-6">
                                                                            <div className="absolute left-0 top-1 w-5 h-5 bg-brand-secondary text-white text-xs rounded-full flex items-center justify-center font-mono">
                                                                                {index + 1}
                                                                            </div>
                                                                            <p className="font-semibold text-sm">{stop.storeName}</p>
                                                                            <p className="text-xs text-gray-500">{stop.address}</p>
                                                                            <p className="text-xs text-brand-dark font-semibold mt-1">
                                                                                Jarak: {distance.toFixed(2)} km
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Departed & Completed Routes */}
                                {(routesByStatus.departed.length > 0 || routesByStatus.completed.length > 0) && (
                                    <div>
                                        <h3 className="text-xl font-bold pb-2 mb-4 border-b">Riwayat Perjalanan</h3>
                                        <div className="space-y-4">
                                            {[...routesByStatus.departed, ...routesByStatus.completed].map(route => {
                                                const driver = users.find(u => u.id === route.driverId);
                                                const vehicle = vehicles.find(v => v.id === route.vehicleId);
                                                return (
                                                    <Card key={route.id} className="opacity-75">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-lg font-bold text-gray-700">
                                                                    {new Date(route.date).toLocaleDateString('id-ID')}
                                                                </h4>
                                                                <p className="text-sm text-gray-600">Driver: {driver?.name} | Armada: {vehicle?.plateNumber}</p>
                                                                <p className="text-sm text-gray-600">{route.stops.length} pemberhentian</p>
                                                            </div>
                                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getAssignmentStatusBadge(route.assignmentStatus).class}`}>
                                                                {getAssignmentStatusBadge(route.assignmentStatus).text}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h2 className="text-2xl font-semibold">Rute Kunjungan Sales</h2><button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg"><ICONS.plus /> Buat Rencana</button></div>
                        {isLoadingSales ? <p>Memuat rute...</p> : (
                            <div className="space-y-4">
                                {sortedSalesRoutes.length === 0 ? (
                                    <Card><p className="text-center py-10 text-gray-500">Belum ada rencana rute kunjungan.</p></Card>
                                ) : (
                                    sortedSalesRoutes.map(route => {
                                        const isExpanded = expandedRouteIds.includes(route.id);
                                        return (
                                            <Card key={route.id}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-brand-primary">Rencana untuk {users.find(u => u.id === route.salesPersonId)?.name}</h3>
                                                        <p className="text-sm text-gray-500">Total: {route.stops.length} Kunjungan</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold bg-blue-100 text-blue-800 py-1 px-2 rounded-full">{new Date(route.date).toLocaleDateString('id-ID')}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 border-t pt-4">
                                                    <div className="flex justify-between items-center">
                                                        <h5 className="font-semibold">Daftar Kunjungan</h5>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => toggleRouteExpansion(route.id)} className="text-sm font-semibold text-gray-600 hover:underline">
                                                                {isExpanded ? 'Sembunyikan' : 'Lihat Detail'}
                                                            </button>
                                                            <button onClick={() => deleteSalesMutation.mutate(route.id)} className="p-2 rounded-lg bg-red-100 text-red-700" title="Hapus Rencana Kunjungan"><ICONS.trash /></button>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="mt-4 pl-4 border-l-2 border-brand-light space-y-3">
                                                            {route.stops.map((stop, stopIndex, array) => {
                                                                const depotLocation = { lat: -7.8664161, lng: 110.1486773 }; // PDAM Tirta Binangun
                                                                const prevLocation = stopIndex === 0 ? depotLocation : array[stopIndex - 1].location;
                                                                const distance = getDistance(prevLocation, stop.location);
                                                                return (
                                                                    <div key={stop.visitId} className="relative pl-6">
                                                                        <div className="absolute left-0 top-1 w-4 h-4 bg-brand-secondary text-white text-xs rounded-full flex items-center justify-center font-mono">{stopIndex + 1}</div>
                                                                        <p className="font-semibold text-sm">{stop.storeName}</p>
                                                                        <p className="text-xs text-gray-500">{stop.address}</p>
                                                                        <p className="text-xs text-gray-600 mt-1 font-medium">Tujuan: {stop.purpose}</p>
                                                                        {distance !== undefined && (
                                                                            <p className="text-xs text-gray-600 mt-1">Jarak dari titik sebelumnya: {distance.toFixed(2)} km</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Modal title={activeTab === 'delivery' ? 'Buat Rute Pengiriman Baru' : 'Buat Rencana Kunjungan'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalError && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{modalError}</div>}
                {activeTab === 'delivery' ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-700">
                                <strong>ℹ️ Info:</strong> Sistem akan membuat rute optimal dari pesanan <strong>Pending</strong> untuk tanggal yang dipilih.
                                Driver dan armada bisa di-assign nanti sebelum rute diberangkatkan.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Tanggal Pengiriman</label>
                            <input
                                type="date"
                                value={deliveryForm.date}
                                onChange={e => setDeliveryForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full p-2 border rounded mt-1"
                            />
                        </div>
                        <div className="flex justify-end pt-4 gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="bg-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateDeliveryPlan}
                                disabled={createDeliveryMutation.isPending}
                                className="bg-brand-primary text-white py-2 px-4 rounded-lg disabled:bg-gray-400 hover:bg-brand-dark transition"
                            >
                                {createDeliveryMutation.isPending ? 'Membuat Rute...' : 'Buat Rute'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div><label>Sales</label><select value={salesForm.salesPersonId} onChange={e => setSalesForm(f => ({ ...f, salesPersonId: e.target.value }))} className="w-full p-2 border rounded mt-1"><option value="" disabled>-- Pilih --</option>{availableSales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div><label>Tanggal</label><input type="date" value={salesForm.visitDate} onChange={e => setSalesForm(f => ({ ...f, visitDate: e.target.value }))} className="w-full p-2 border rounded mt-1" /></div>
                        <div className="flex justify-end pt-4"><button onClick={() => setIsModalOpen(false)} className="bg-gray-200 py-2 px-4 rounded-lg mr-2">Batal</button><button onClick={handleCreateSalesPlan} disabled={createSalesMutation.isPending} className="bg-brand-primary text-white py-2 px-4 rounded-lg disabled:bg-gray-400">{createSalesMutation.isPending ? 'Membuat...' : 'Hasilkan Rute'}</button></div>
                    </div>
                )}
            </Modal>

            {/* Modal for Assigning Driver & Vehicle */}
            <Modal
                title="Assign Driver & Armada"
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setSelectedRouteForAssignment(null);
                    setAssignmentForm({ vehicleId: '', driverId: '' });
                }}
            >
                {modalError && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4">{modalError}</div>}
                {selectedRouteForAssignment && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Rute:</strong> {new Date(selectedRouteForAssignment.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Wilayah:</strong> {selectedRouteForAssignment.region}
                            </p>
                            <p className="text-sm text-gray-700">
                                <strong>Total Pemberhentian:</strong> {selectedRouteForAssignment.stops.length}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Pilih Armada</label>
                            <select
                                value={assignmentForm.vehicleId}
                                onChange={e => setAssignmentForm(f => ({ ...f, vehicleId: e.target.value }))}
                                className="w-full p-2 border rounded mt-1"
                            >
                                <option value="">-- Pilih Armada --</option>
                                {vehicles.filter(v => v.status === VehicleStatus.IDLE).map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.plateNumber} - {v.model} (Kapasitas: {v.capacity})
                                    </option>
                                ))}
                            </select>
                            {vehicles.filter(v => v.status === VehicleStatus.IDLE).length === 0 && (
                                <p className="text-xs text-red-600 mt-1">⚠️ Tidak ada armada yang tersedia (status Idle)</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Pilih Driver</label>
                            <select
                                value={assignmentForm.driverId}
                                onChange={e => setAssignmentForm(f => ({ ...f, driverId: e.target.value }))}
                                className="w-full p-2 border rounded mt-1"
                            >
                                <option value="">-- Pilih Driver --</option>
                                {availableDrivers.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end pt-4 gap-2">
                            <button
                                onClick={() => {
                                    setIsAssignModalOpen(false);
                                    setSelectedRouteForAssignment(null);
                                    setAssignmentForm({ vehicleId: '', driverId: '' });
                                }}
                                className="bg-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleAssignDriverVehicle}
                                disabled={assignDriverVehicleMutation.isPending || !assignmentForm.vehicleId || !assignmentForm.driverId}
                                className="bg-brand-primary text-white py-2 px-4 rounded-lg disabled:bg-gray-400 hover:bg-brand-dark transition"
                            >
                                {assignDriverVehicleMutation.isPending ? 'Meng-assign...' : 'Assign'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};