# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
# mongodb-memory-server is only used by the test suite – don't download a MongoDB binary here
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS run
ENV NODE_ENV=production \
    PORT=3000 \
    # Behind the ingress: take protocol, host and client IP from the proxy headers
    PROTOCOL_HEADER=x-forwarded-proto \
    HOST_HEADER=x-forwarded-host \
    ADDRESS_HEADER=x-forwarded-for \
    XFF_DEPTH=1 \
    BODY_SIZE_LIMIT=64K
WORKDIR /app
COPY --from=build --chown=root:root /app/build ./build
COPY --from=build --chown=root:root /app/node_modules ./node_modules
COPY --from=build --chown=root:root /app/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "build"]
