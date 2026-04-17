# Stage 1 — Build
FROM node:22-alpine AS build
WORKDIR /app

# Build-time env vars (VITE_ prefix = inlined in bundle)
ARG VITE_SUPABASE_URL
ARG VITE_ADMIN_PASSWORD

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD

# Install game deps first (admin-tool imports game components via @game alias)
COPY package.json package-lock.json ./
RUN npm ci

# Copy game source (needed for @game alias in admin-tool build)
COPY src/ src/
COPY public/ public/
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./

# Install admin-tool deps
COPY admin-tool/package.json admin-tool/package-lock.json admin-tool/
RUN cd admin-tool && npm ci

# Copy admin-tool source and build
COPY admin-tool/ admin-tool/
RUN cd admin-tool && npm run build

# Stage 2 — Runtime (Express + proxies, pas de deps frontend)
FROM node:22-alpine
WORKDIR /app

RUN echo '{"type":"module"}' > package.json && npm install express http-proxy-middleware

COPY --from=build /app/admin-tool/dist ./dist
COPY admin-tool/server.js ./server.js

EXPOSE 3001
CMD ["node", "server.js"]
