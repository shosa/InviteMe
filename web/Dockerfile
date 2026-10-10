# Frontend: Next.js. Le rewrite /api -> API sono fissate in fase di build: API_INTERNAL_URL va passata come argomento.
FROM node:24-alpine AS build
WORKDIR /app
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=$API_INTERNAL_URL NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace @inviteme/web --workspace @inviteme/shared --include-workspace-root

COPY shared shared
COPY web web
RUN npm run build -w @inviteme/web

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@inviteme/web"]
