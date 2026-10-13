# Multi-stage production Dockerfile for BatteryGuard AI (Unified Service)

# -------------------------------------------------------------
# Stage 1: Build React Vite Frontend
# -------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY batteryguard-ai/frontend/package*.json ./
RUN npm install

COPY batteryguard-ai/frontend ./
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Production Python FastAPI Backend
# -------------------------------------------------------------
FROM python:3.11-slim
WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY batteryguard-ai/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend application
COPY batteryguard-ai/backend /app/batteryguard-ai/backend

# Copy built frontend assets for FastAPI SPA serving
COPY --from=frontend-builder /app/frontend/dist /app/batteryguard-ai/frontend/dist

WORKDIR /app/batteryguard-ai/backend

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
