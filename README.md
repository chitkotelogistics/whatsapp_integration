# 🚚 Chitkote Logistics — WhatsApp & Voice Integration System

Production-ready logistics management platform with Meta WhatsApp Business Cloud API (v25.0) integration and Exotel Voice telephony.

> 📘 **Full Architecture & Technical Specification:** See [`PROJECT_ARCHITECTURE.md`](file:///f:/CK%20Logistics/WhatsappIntegration/PROJECT_ARCHITECTURE.md) for full system diagrams, database schemas, Meta template details, and API documentation.

---

## ⚡ Tech Stack At A Glance

### **Frontend (`/frontend`)**
* **Framework:** React 18 + Vite 5
* **Styling:** Tailwind CSS 3 (Dark Theme, Glassmorphism UI)
* **Libraries:** `xlsx` (SheetJS for CSV/Excel upload/export), `axios`, `react-router-dom`, `@heroicons/react`

### **Backend (`/backend`)**
* **Server Framework:** Node.js (v24.x) + Express.js
* **Database Driver:** `mysql2` (Connection Pool + Async/Await)
* **API Clients:** Axios for Meta Graph API v25.0 & Exotel Voice API
* **Scheduler:** Node background scheduler for timed dispatches

### **Database & Storage (`chitkote_logistics`)**
* **Primary DB:** MySQL 8.0 (Port 3306)
* **Fallback Storage:** Persistent JSON storage (`fileStore.js`) for 100% uptime if MySQL is offline

---

## 🚀 Quick Start Commands

To start both Backend (Port 5000) and Frontend (Port 3000) concurrently:

```bash
# Simply run the startup batch file
.\start-all.bat
```

Or start individually:

```bash
# 1. Start Backend API (Port 5000)
cd backend
node src/server.js

# 2. Start Frontend UI (Port 3000)
cd frontend
npm run dev
```

---

## 📱 Meta WhatsApp Integration Details
* **Approved Utility Template:** `new_load_available_utility` (Category: `UTILITY`)
* **Category Advantage:** Bypasses 24-hour marketing window limits for 100% delivery rate to all driver numbers in India.
* **Format:**
  ```text
  🚛 *New Load Available*

  *Load Details:*

  📍 *Pickup:* {{1}}
  📍 *Delivery:* {{2}}
  🚚 *Vehicle Required:* {{3}}
  ⚖️ *Weight:* {{4}}
  💰 *Freight:* ₹{{5}}

  📞 *Contact:* {{6}}

  This is an automated load notification from *Chitkote Logistics India Private Limited*.
  ```

---
*For complete technical details, database schemas, and endpoints, open [`PROJECT_ARCHITECTURE.md`](file:///f:/CK%20Logistics/WhatsappIntegration/PROJECT_ARCHITECTURE.md).*
