ARG NODE_IMAGE=node:26.13.1-slim

FROM ${NODE_IMAGE} AS build
RUN npm install -g pnpm@12.21.0
WORKDIR /src
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/rules/package.json packages/rules/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @rollhouse/web --filter @rollhouse/server build

# The server is bundled into one file, so the runtime image needs no node_modules.
FROM ${NODE_IMAGE} AS runtime
ARG GIT_SHA=dev
ENV NODE_ENV=production \
    PORT=8080 \
    GIT_SHA=${GIT_SHA} \
    WEB_DIST=/app/web \
    DATA_DIR=/data
WORKDIR /app
COPY --from=build --chown=1000:1000 /src/apps/server/dist/ /app/server/
COPY --from=build --chown=1000:1000 /src/apps/web/dist/ /app/web/
RUN mkdir -p /data && chown 1000:1000 /data
# uid/gid 1000 is the "node" user in the official image.
USER 1000:1000
EXPOSE 8080
CMD ["node", "--enable-source-maps", "/app/server/index.mjs"]
