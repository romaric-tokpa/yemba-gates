# =============================================================================
# DOCKERFILE FRONTEND - RECRUTEMENT APP
# =============================================================================
# Build: docker build -t recrutement-frontend .
# Run: docker run -p 3000:3000 recrutement-frontend

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances avec logs détaillés
RUN echo "Installing dependencies..." && \
    npm ci --only=production=false --verbose || \
    (echo "npm ci failed, trying npm install..." && npm install) && \
    echo "Dependencies installed successfully"

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les dépendances depuis le stage précédent
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement pour le build
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Désactiver la télémétrie Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build l'application (avec gestion d'erreur explicite et logs)
RUN echo "Starting Next.js build..." && \
    echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" && \
    npm run build 2>&1 | tee /tmp/build.log || \
    (echo "=== BUILD FAILED ===" && cat /tmp/build.log && exit 1) && \
    echo "Build completed successfully" && \
    ls -la .next/standalone 2>/dev/null || echo "Warning: .next/standalone not found"

# -----------------------------------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Définir l'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copier les fichiers publics
COPY --from=builder /app/public ./public

# Copier les fichiers standalone (optimisés pour la production)
# Vérifier que le dossier standalone existe avant de copier
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Vérifier que server.js existe
RUN test -f server.js || (echo "server.js not found in standalone output!" && exit 1)

# Passer à l'utilisateur non-root
USER nextjs

# Port exposé
EXPOSE 3000

# Variables d'environnement runtime
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check (utiliser 127.0.0.1 au lieu de localhost pour éviter les problèmes IPv6)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Commande de démarrage
CMD ["node", "server.js"]
