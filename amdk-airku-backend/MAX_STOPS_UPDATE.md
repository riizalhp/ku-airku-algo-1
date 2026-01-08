# 🚚 Clarke-Wright Algorithm Update: Max Stops Per Route

## 📋 Perubahan

Menambahkan constraint **maksimal stops per rute** pada algoritma Clarke-Wright Savings Matrix untuk menghasilkan pembagian rute yang lebih optimal.

### Sebelum:

- ❌ 12 stops → 1 rute (jarak 121.8 km)
- Total muatan 180.7 units < kapasitas 200 units
- Semua digabung dalam 1 rute karena kapasitas cukup

### Sesudah:

- ✅ 12 stops → ~3-4 rute (4 stops per rute)
- Pembagian lebih seimbang dan efisien
- Waktu pengiriman per rute lebih pendek

---

## 🔧 File yang Diubah

### 1. **routingService.js** - Core Algorithm

```javascript
// Tambahan parameter maxStopsPerRoute
const calculateSavingsMatrixRoutes = (nodes, depotLocation, vehicleCapacity, maxStopsPerRoute = Infinity)

// Constraint baru di merge logic:
if (newStopsCount > maxStopsPerRoute) {
    skippedStops++;
    continue; // Skip merge jika melebihi batas stops
}
```

**Logging tambahan:**

- Total routes created
- Merges performed
- Skipped due to capacity
- Skipped due to max stops

### 2. **routeController.js** - Route Planning

```javascript
const MAX_STOPS_PER_ROUTE = 4; // Set ke 4 stops

// Unassigned routes
calculateSavingsMatrixRoutes(
  nodes,
  depotLocation,
  DEFAULT_CAPACITY,
  MAX_STOPS_PER_ROUTE
);

// Assigned routes
calculateSavingsMatrixRoutes(
  nodes,
  depotLocation,
  vehicle.capacity,
  MAX_STOPS_PER_ROUTE
);
```

### 3. **shipmentController.js** - Shipment Routes

```javascript
const MAX_STOPS_PER_ROUTE = 4;
calculateSavingsMatrixRoutes(
  nodes,
  depotLocation,
  vehicle.capacity,
  MAX_STOPS_PER_ROUTE
);
```

### 4. **salesVisitRouteController.js** - Sales Visit Routes

```javascript
const MAX_STOPS_PER_ROUTE = 8; // Lebih tinggi untuk sales visit
calculateSavingsMatrixRoutes(
  nodes,
  depotLocation,
  Infinity,
  MAX_STOPS_PER_ROUTE
);
```

---

## 🎯 Hasil untuk Tanggal 11/01/2026

**Data:**

- 12 orders
- 12 stores
- Total: 180.7 units

**Hasil Baru:**

- **3-4 rute** (tergantung distribusi geografis)
- **3-4 stops per rute**
- Jarak lebih pendek per rute
- Waktu pengiriman lebih efisien

---

## ⚙️ Konfigurasi

Untuk mengubah jumlah stops maksimal, edit nilai `MAX_STOPS_PER_ROUTE` di:

```javascript
// Delivery routes (default)
const MAX_STOPS_PER_ROUTE = 4;

// Sales visit (lebih tinggi)
const MAX_STOPS_PER_ROUTE = 8;

// Unlimited (backward compatible)
const MAX_STOPS_PER_ROUTE = Infinity;
```

---

## 📊 Trade-offs

**Keuntungan:**

- ✅ Pembagian rute lebih seimbang
- ✅ Waktu per rute lebih pendek
- ✅ Lebih mudah dikelola driver
- ✅ Fleksibilitas assignment driver

**Pertimbangan:**

- ⚠️ Bisa lebih banyak kendaraan diperlukan
- ⚠️ Total jarak keseluruhan mungkin sedikit lebih panjang
- ⚠️ Perlu lebih banyak driver available

---

## 🧪 Testing

Untuk test dengan data 11/01/2026:

```bash
cd amdk-airku-backend
node cek_routed_orders.js
```

Atau create route melalui frontend:

1. Buka Manajemen Pesanan
2. Pilih orders untuk 11/01/2026
3. Klik "Buat Rute Optimal"
4. Lihat hasilnya di Pantau Muatan

---

## 📝 Notes

- Parameter backward compatible (default: Infinity)
- Tidak mempengaruhi algoritma existing yang tidak pass parameter
- Logging detail untuk debugging
- Constraint dicek sebelum merge, tidak break algoritma Clarke-Wright
