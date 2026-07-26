# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Build Next.js
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.js ./

# Install only production dependencies if needed (already copied from builder)
# RUN npm prune --production

EXPOSE 3000

# Script to run migrations and start the app
CMD ["sh", "-c", "npx prisma db push && npm start"]
