# syntax=docker/dockerfile:1
# Build context is the repository root (same reasoning as apps/api/Dockerfile).
#
# NEXT_PUBLIC_API_URL is inlined into the client bundle at build time, not
# read at container start — it must be the URL the *browser* can reach
# (e.g. http://localhost:3001), not an internal Docker network hostname,
# since apps/web has no server-side session or privileged API access of
# its own (see apps/web/README.md).

FROM node:22-alpine AS build
WORKDIR /repo
COPY . .
RUN npm ci
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build --workspace @wisdum/web

FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
