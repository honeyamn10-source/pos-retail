FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate && pnpm install --frozen-lockfile && node scripts/build-server.mjs
FROM node:24-bookworm-slim
ENV NODE_ENV=production JAWA_HOST=0.0.0.0 JAWA_PORT=8787 JAWA_DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/server-dist ./server-dist
COPY server/restore.mjs ./server/restore.mjs
COPY product.json ./product.json
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8787
CMD ["node","server-dist/main.js"]
