# Stage 1 — Build game + admin-tool (v2 — unified build 2026-04-17)
ARG CACHE_BUST=1
FROM node:22-alpine AS build
WORKDIR /app

# Vite env vars (injected at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GAME_BASE_URL
ARG VITE_ADMIN_PASSWORD

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GAME_BASE_URL=$VITE_GAME_BASE_URL
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD

# Install game deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy game source
COPY . .

# Build game
RUN npm run build

# Build admin-tool (needs game source for @game alias)
RUN cd admin-tool && npm ci && npm run build

# Stage 2 — Runtime (node + nginx)
FROM node:22-alpine
RUN apk add --no-cache nginx gettext

WORKDIR /app

# Install admin-tool server deps
RUN echo '{"type":"module"}' > package.json && npm install express http-proxy-middleware

# Copy builds
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/admin-tool/dist /usr/share/nginx/html/admin

# Copy server + nginx config
COPY admin-tool/server.js ./admin-server.js
COPY nginx.conf /etc/nginx/nginx.conf.template

# Entrypoint script
RUN printf '#!/bin/sh\n\
if [ "$SERVICE_MODE" = "admin" ]; then\n\
  exec node /app/admin-server.js\n\
else\n\
  envsubst "\\$PORT" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf\n\
  exec nginx -g "daemon off;"\n\
fi\n' > /entrypoint.sh && chmod +x /entrypoint.sh

ENV PORT=80
EXPOSE 80
CMD ["/entrypoint.sh"]
