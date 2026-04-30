# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app/frontend

ARG CACHEBUST=2026-04-29-22-18
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=/api
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine as backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY backend ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --only=production

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=frontend-builder /app/frontend/dist ./client

ENV PORT=3001
EXPOSE 3001

RUN rm -f .env backend/.env backend/prisma/.env prisma/.env

# ✅ الإصلاح النهائي للمسار وللمايغريشن
CMD ["sh", "-c", "npx prisma migrate resolve --applied 0_init || true && npx prisma migrate deploy || true && node dist/src/main.js"]