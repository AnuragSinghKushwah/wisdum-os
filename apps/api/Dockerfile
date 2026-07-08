# syntax=docker/dockerfile:1
# Build context is the repository root: npm workspaces need every
# workspace's package.json present to resolve internal @wisdum/* deps,
# and there's no pruning tool (e.g. turbo) in this repo to do it more
# surgically, so the whole tree is copied before `npm ci`.

FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
RUN npm ci
RUN npm run build --workspace @wisdum/api
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/apps/api ./apps/api
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/platform ./platform

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
