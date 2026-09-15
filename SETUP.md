
# Towbook WASM AI Pipeline Setup Guide

This backend pipeline connects Towbook webhooks with an in-house app using local WASM AI model inference, BullMQ Redis queues, and Dockerized PostgreSQL.

## Quick Start

1. **Clone repo & switch branch:**
   ```bash
   git clone https://github.com/northstar-assistance/wasm-jit-engine.git
   cd wasm-jit-engine
   git checkout -b backend/ai-pipeline
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start Docker Services:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database:**
   ```bash
   npm run db:migrate
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```

## Test Webhook Endpoint

Send a sample ticket payload via cURL:

```bash
curl -X POST http://localhost:3000/api/webhooks/towbook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "CALL_CREATED",
    "ticketData": {
      "id": "TICKET-992",
      "description": "Vehicle stranded on highway",
      "notes": "Driver locked keys inside cab while changing flat tire."
    }
  }'
```

Check metrics at:
`http://localhost:3000/api/metrics/summary`