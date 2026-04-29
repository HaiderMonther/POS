# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app/frontend

# Accept frontend build arguments
ARG VITE_CLERK_PUBLISHABLE_KEY

# Set frontend environment variables for Vite
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

# Stage 3: Production Image
FROM node:20-alpine
WORKDIR /app/backend

# Copy backend dependencies
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production

# Copy backend build
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma

# Copy frontend build into backend's client folder
COPY --from=frontend-builder /app/frontend/dist ./client

ENV PORT=3001
EXPOSE 3001

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
