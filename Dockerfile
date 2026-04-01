# Stage 1 — Build
FROM node:22-alpine AS build
WORKDIR /app

# Vite env vars (injected at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_SERVICE_KEY
ARG VITE_ADMIN_PASSWORD
ARG VITE_ANTHROPIC_KEY
ARG VITE_GAME_BASE_URL
ARG VITE_APP_VERSION

# Install + build game
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Install + build admin
WORKDIR /app/admin-tool
ENV VITE_ANTHROPIC_KEY=$VITE_ANTHROPIC_KEY
RUN npm ci
RUN npm run build

# Merge admin into game dist
RUN cp -r /app/admin-tool/dist /app/dist/admin

# Stage 2 — Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/templates/nginx.conf.template
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=80
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
EXPOSE 80
