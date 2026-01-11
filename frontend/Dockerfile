# Stage 1: Build
FROM node:20-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (utiliser npm install si package-lock.json n'est pas synchronisé)
RUN npm install

# Copier le reste du code
COPY . .

# Build l'application Next.js avec standalone
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Définir l'environnement en production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public

# Copier les fichiers standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Passer à l'utilisateur non-root
USER nextjs

# Exposer le port 3000
EXPOSE 3000

# Variable d'environnement pour le port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Commande pour démarrer l'application
CMD ["node", "server.js"]
