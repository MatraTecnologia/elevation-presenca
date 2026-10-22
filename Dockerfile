# syntax=docker/dockerfile:1

# Mesmo padrão do dashboard da Gestora, adaptado para um projeto Next.js único.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Instalação isolada para aproveitar o cache do lockfile.
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Valores exclusivos deste comando. Gerar o client e compilar não acessam o banco.
# As credenciais reais são configuradas somente no ambiente do container.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=presenca" \
    BETTER_AUTH_SECRET="build-only-placeholder-not-a-runtime-secret-0123456789" \
    BETTER_AUTH_URL="http://localhost:3000" \
    npm run build

# Job opcional de atualização do banco: docker build --target migrator ...
# Executa somente as migrations versionadas, sem seed nem db push.
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
USER node
CMD ["npm", "run", "db:migrate"]

# Imagem final: servidor standalone, assets e usuário sem privilégios de root.
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
