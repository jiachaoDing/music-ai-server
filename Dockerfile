FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true
RUN apk add --no-cache openssl

FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS build
COPY prisma ./prisma
COPY src ./src
COPY nest-cli.json tsconfig*.json ./
RUN npm run prisma:generate && npm run build

FROM deps AS test
COPY src ./src
COPY test ./test
COPY nest-cli.json tsconfig*.json vitest*.config.ts ./
RUN npm test && npm run test:e2e

FROM base AS prod-deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
