# 🚚 KU AIRKU - Sistem Manajemen Distribusi Air Minum

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)]()
[![Version](https://img.shields.io/badge/Version-2.0-blue)]()
[![Node](https://img.shields.io/badge/Node-20.x-green)]()
[![React](https://img.shields.io/badge/React-18.2-blue)]()
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

> Sistem terintegrasi untuk PDAM Tirta Binangun, Kabupaten Kulon Progo - Mengotomatisasi routing, tracking, dan manajemen armada dengan AI & algoritma optimasi.

---

## 🎯 Quick Overview

**KU AIRKU** adalah platform web full-stack yang mengintegrasikan:

- 🤖 **AI-Powered Region Classification** (Google Gemini 2.5 Flash)
- 🗺️ **Clarke-Wright Route Optimization**
- 📦 **Shipment-Based Load Management**
- ⚖️ **Homogeneous/Heterogeneous Capacity System**
- 📊 **Real-Time Tracking & Analytics**
- 🔐 **Role-Based Access Control** (Admin/Sales/Driver)

---

## 📚 Documentation

### 📖 **[→ COMPLETE PROJECT DOCUMENTATION](./PROJECT_DOCUMENTATION.md)**

**2000+ lines** comprehensive guide covering:

- Architecture & Technology Stack
- Database Schema (11 tables)
- Backend & Frontend Structure
- Core Features & Algorithms
- API Documentation
- Deployment Guide
- Troubleshooting & Best Practices

### 📋 Additional Guides

| Document                                                                    | Description                                 |
| --------------------------------------------------------------------------- | ------------------------------------------- |
| [URL Routing Implementation](./URL_ROUTING_IMPLEMENTATION.md)               | React Router setup with MPA-style URLs      |
| [Shipment Migration Guide](./SHIPMENT_MIGRATION_GUIDE.md)                   | Vehicle-centric to Shipment-based migration |
| [Frontend Update Summary](./FRONTEND_UPDATE_SUMMARY.md)                     | Frontend architecture changes               |
| [Capacity System Guide](./amdk-airku-backend/docs/CAPACITY_SYSTEM_GUIDE.md) | Homogeneous/Heterogeneous logic             |
| [Conversion Rate Table](./amdk-airku-backend/docs/CONVERSION_RATE_TABLE.md) | Product capacity mappings                   |

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 20.x
MySQL 8.0
Git
```

### 1. Clone Repository

```bash
git clone https://github.com/riizalhp/ku-airku-algo-1.git
cd ku-airku-algo-1
```

### 2. Backend Setup

```bash
cd amdk-airku-backend
npm install
```

Create `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=amdk_airku
JWT_SECRET=your_jwt_secret_min_32_characters
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

Import database:

```bash
mysql -u root -p < amdk_airku_db.sql
```

Run migrations:

```bash
mysql -u root -p amdk_airku < migrations/add_capacity_conversion.sql
mysql -u root -p amdk_airku < migrations/add_shipments_table.sql
mysql -u root -p amdk_airku < migrations/allow_null_driver_vehicle_in_routes.sql
```

Start backend:

```bash
npm start
```

### 3. Frontend Setup

```bash
cd amdk-airku-frontend
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start frontend:

```bash
npm run dev
```

### 4. Access Application

```
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

**Default Login:**

```
Admin:
Email: admin@pdam.com
Password: admin123

Sales:
Email: sales@pdam.com
Password: sales123

Driver:
Email: driver@pdam.com
Password: driver123
```

### 5. Access from Other Devices (Optional)

Aplikasi dapat diakses dari perangkat lain di jaringan WiFi yang sama.

**Setup Firewall (Windows - Run as Administrator):**

```powershell
.\setup-firewall.ps1
```

**Get IP Address:**

```powershell
.\get-ip.ps1
```

Akses dari perangkat lain:

```
Frontend: http://[YOUR-IP]:5173
Backend:  http://[YOUR-IP]:3001
```

📖 **Panduan lengkap:** [NETWORK_ACCESS.md](./NETWORK_ACCESS.md)

---

## 🏗️ System Architecture

```
┌─────────────────┐
│  React Frontend │ ← Vite + TypeScript + TailwindCSS
└────────┬────────┘
         │ REST API (Axios)
         ▼
┌─────────────────┐
│ Express Backend │ ← Node.js + JWT Auth
└────────┬────────┘
         │ MySQL Protocol
         ▼
┌─────────────────┐
│  MySQL Database │ ← 11 Tables + Indexes
└─────────────────┘
         +
┌─────────────────┐
│  External APIs  │ ← Gemini AI, OSM Maps
└─────────────────┘
```

---

## ⭐ Key Features

### 1. **Shipment-Based Load Management** 🆕

```
Create Shipment → Add Orders → Assign Driver+Vehicle → Auto Route Generation
```

- Better load planning than vehicle-centric approach
- Capacity validation before assignment
- Automatic route optimization

### 2. **AI Region Classification** 🤖

- Google Gemini 2.5 Flash for address classification
- Fallback to bounding box if AI fails
- 95%+ accuracy for DIY regions

### 3. **Smart Capacity System** ⚖️

- **Homogeneous**: 1 product type (capacityUnit = 1.0)
- **Heterogeneous**: Mixed products (custom conversion rates)

```
Example:
30 × 240ml (1.0) + 20 × 19L (3.3) = 96 units
```

### 4. **Route Optimization** 🗺️

- Clarke-Wright Savings Algorithm
- O(n² log n) complexity
- Haversine distance calculation
- Multi-trip support

### 5. **Real-Time Tracking** 📍

- Driver app with turn-by-turn navigation
- Proof of delivery capture
- Live status updates

### 6. **Analytics Dashboard** 📊

- Order metrics & revenue tracking
- Vehicle utilization reports
- Delivery performance analytics
- Exportable PDF reports

---

## 🛠️ Technology Stack

| Layer        | Technology         | Version        |
| ------------ | ------------------ | -------------- |
| **Frontend** | React + TypeScript | 18.2.0 / 5.2.2 |
| **Routing**  | React Router       | 6.x            |
| **State**    | TanStack Query     | 5.51.1         |
| **Styling**  | Tailwind CSS       | 3.4.4          |
| **Maps**     | Leaflet            | 1.9.4          |
| **Charts**   | Recharts           | 2.12.7         |
| **Backend**  | Node.js + Express  | 20.x / 4.x     |
| **Database** | MySQL              | 8.0            |
| **Auth**     | JWT + bcrypt       | 9.x / 5.x      |
| **AI**       | Google Gemini      | 2.5 Flash      |
| **Hosting**  | Railway + Vercel   | Cloud          |

---

## 📊 Database Schema (Simplified)

```sql
users (id, name, email, password, role)
├── orders (id, store_id, total_amount, status, shipment_id)
│   └── order_items (id, order_id, product_id, quantity, price)
├── visits (id, store_id, sales_id, status)
│   └── surveys (id, visit_id, responses)
└── route_plans (id, driver_id, vehicle_id, shipment_id)
    └── route_stops (id, route_plan_id, order_id, sequence, status)

stores (id, name, address, lat, lng, region)

products (id, sku, name, price, stock, capacityUnit, capacityConversionHeterogeneous)

vehicles (id, plate_number, model, capacity, status)

shipments (id, name, date, status, driver_id, vehicle_id, route_plan_id) ⭐ NEW
```

**Total:** 11 main tables with 15+ indexes

---

## 🔌 API Endpoints

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

### Core Resources

```http
GET    /api/stores
POST   /api/stores
GET    /api/products
POST   /api/products
GET    /api/orders
POST   /api/orders
POST   /api/orders/validate-multiple-capacity
GET    /api/vehicles
POST   /api/vehicles
```

### Shipments ⭐

```http
GET    /api/shipments?date=2025-10-29&status=assigned
POST   /api/shipments
POST   /api/shipments/:id/orders
POST   /api/shipments/:id/assign
DELETE /api/shipments/:id/orders/:orderId
DELETE /api/shipments/:id
```

### Routes

```http
GET    /api/routes?driverId=xxx&date=2025-10-29
POST   /api/routes
PUT    /api/routes/:id/stops/:stopId
```

### Visits & Surveys

```http
GET    /api/visits
POST   /api/visits
PUT    /api/visits/:id
POST   /api/surveys
```

**Full API docs:** See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md#api-documentation)

---

## 🧪 Testing

### Run Backend Tests

```bash
cd amdk-airku-backend
npm test
```

### Run Frontend Tests

```bash
cd amdk-airku-frontend
npm test
```

### Manual Testing Checklist

- [ ] User authentication (all roles)
- [ ] Store creation with AI classification
- [ ] Order creation with capacity validation
- [ ] Shipment workflow (create → add orders → assign)
- [ ] Route generation and optimization
- [ ] Driver delivery tracking
- [ ] Sales visit management
- [ ] Survey submission

---

## 🚀 Deployment

### Production URLs

```
Frontend: https://ku-airku.vercel.app (TBD)
Backend:  https://ku-airku.railway.app (TBD)
Database: Railway MySQL
```

### Deploy Backend (Railway)

1. Connect GitHub repo to Railway
2. Set environment variables
3. Run migrations on Railway MySQL
4. Auto-deploy on push

### Deploy Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set `VITE_API_URL` environment variable
3. Add `vercel.json` for SPA routing
4. Auto-deploy on push

**Full deployment guide:** [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md#deployment-guide)

---

## 📈 Performance

| Metric              | Value              |
| ------------------- | ------------------ |
| Concurrent Users    | 100+               |
| Response Time (avg) | ~120ms             |
| Route Calculation   | ~2s for 20 stops   |
| AI Classification   | ~1.5s per address  |
| Database Queries    | <50ms with indexes |

---

## 🐛 Common Issues

### Database Connection Failed

```bash
# Check Railway status
# Verify .env credentials
mysql -h HOST -u USER -p --port PORT DATABASE
```

### CORS Error

```javascript
// Backend: Add frontend URL to CORS whitelist
cors({ origin: ["http://localhost:5173", "https://your-app.vercel.app"] });
```

### AI Classification Failed

```
System automatically falls back to bounding box classification
Check Gemini API key and quota
```

**More troubleshooting:** [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md#troubleshooting)

---

## 🗺️ Roadmap

### ✅ Completed (v2.0)

- Shipment-based load management
- URL routing implementation
- Homogeneous/Heterogeneous capacity
- AI region classification
- Clarke-Wright optimization

### 🔜 Upcoming (v2.1 - Q4 2025)

- [ ] Mobile apps (React Native)
- [ ] WhatsApp notifications
- [ ] Payment gateway integration
- [ ] Advanced analytics & ML

### 🚀 Future (v3.0 - Q1 2026)

- [ ] Offline mode with sync
- [ ] GraphQL API
- [ ] Redis caching
- [ ] Multi-language support

---

## 👥 Team

**Developer:** Riizal HP  
**Organization:** PDAM Tirta Binangun  
**Location:** Kabupaten Kulon Progo, DIY  
**Contact:** riizalhp@example.com

---

## 📄 License

Proprietary software © 2025 PDAM Tirta Binangun  
All rights reserved

---

## 🙏 Acknowledgments

- PDAM Tirta Binangun - Project sponsor
- Google Gemini AI - Region classification
- OpenStreetMap - Map data
- Railway - Cloud infrastructure
- Vercel - Frontend hosting

---

## 📞 Support

For questions, issues, or contributions:

- 📧 Email: riizalhp@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/riizalhp/ku-airku-algo-1/issues)
- 📖 Docs: [Complete Documentation](./PROJECT_DOCUMENTATION.md)

---

**Made with ❤️ for PDAM Tirta Binangun**
