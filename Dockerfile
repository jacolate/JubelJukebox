# syntax=docker/dockerfile:1
FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:25-alpine AS run
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/jukebox.db \
    # The app runs behind a TLS-terminating reverse proxy (Caddy, Ingress, …):
    # take protocol, host and client IP from its headers.
    PROTOCOL_HEADER=x-forwarded-proto \
    HOST_HEADER=x-forwarded-host \
    ADDRESS_HEADER=x-forwarded-for \
    XFF_DEPTH=1 \
    BODY_SIZE_LIMIT=64K
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /app/data && chown node:node /app/data
USER node
VOLUME /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "build"]
