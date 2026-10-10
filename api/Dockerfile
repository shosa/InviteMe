# API: Fastify + PostgreSQL. Il codice TypeScript viene eseguito con tsx (dipendenza di produzione).
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace @inviteme/api --workspace @inviteme/shared --include-workspace-root \
 && npm cache clean --force

COPY shared shared
COPY api api

RUN mkdir -p /app/data/media && chown -R node:node /app/data
USER node
EXPOSE 4000
CMD ["npx", "tsx", "api/src/server.ts"]
