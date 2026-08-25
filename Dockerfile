FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY servers ./servers
COPY apps ./apps
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV MCP_AUTH_STORE=/data/auth-keys.json
RUN corepack enable && mkdir -p /data && chown node:node /data
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/servers ./servers
COPY --from=build /app/apps ./apps
VOLUME ["/data"]
EXPOSE 3000
USER node
CMD ["node", "apps/host/dist/index.js"]
