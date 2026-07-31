# Chitkote Logistics

Production-ready starter for a logistics management system with WhatsApp Business Cloud API integration.

## Features
- React + Tailwind frontend
- Express + MySQL backend
- WhatsApp Cloud API text/template/image/document messaging
- Settings page for Meta credentials
- Load posting and WhatsApp message preview
- Broadcast page with queue-based sending
- Webhook handling and message logging
- Dashboard analytics

## Setup
1. Create MySQL database and import backend/sql/schema.sql
2. Copy backend/.env.example to backend/.env and fill your credentials
3. Install dependencies:
   - cd backend && npm install
   - cd ../frontend && npm install
4. Start services:
   - cd backend && npm run dev
   - cd frontend && npm run start

## Notes
- Replace placeholder credentials with your Meta Business account values.
- The queue delay is configured via QUEUE_DELAY_MS (default 2000ms).
