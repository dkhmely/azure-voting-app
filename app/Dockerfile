FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev --no-audit --no-fund;

FROM node:20-slim AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./server.js
COPY public ./public

USER node

ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
