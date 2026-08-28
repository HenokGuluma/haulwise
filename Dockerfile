FROM node:20-alpine AS base
# Prisma's query engine needs a real OpenSSL on Alpine (otherwise it falls
# back to a guessed engine and can fail at runtime); libc6-compat covers a
# few native deps that assume glibc.
RUN apk add --no-cache openssl libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci runs the postinstall (`prisma generate`) hook, which needs the
# schema present — copy it in before installing, not after.
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
