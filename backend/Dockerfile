# Multi-stage build: builder stage + production stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage: node:20-alpine (not full node)
FROM node:20-alpine AS production

WORKDIR /app

# Non-root user
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

# Copy only node_modules/.production (production dependencies)
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

USER nodeapp

EXPOSE 8080

# Health check to ensure readiness
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
