# Stage 1 — Build
FROM node:22-alpine AS build
WORKDIR /app

# Vite env vars (injected at build time)
# ⚠️ CRITIQUE : NE JAMAIS passer VITE_SUPABASE_SERVICE_KEY ici.
# Tout ce qui commence par VITE_ est inliné dans le JS public du bundle.
# La clé service_role bypasse RLS — si elle fuite, tout Supabase est compromis.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GAME_BASE_URL

# Expose Vite env vars for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GAME_BASE_URL=$VITE_GAME_BASE_URL

# Install + build game
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ⚠️ admin-tool NE DOIT PAS être mergé dans le build principal.
# Il contient la clé service_role dans son bundle (via VITE_SUPABASE_SERVICE_KEY)
# et doit être déployé séparément sur un sous-domaine privé ou en local uniquement.
# Pour tester l'admin : `cd admin-tool && npm run dev` (jamais en prod public).

# Stage 2 — Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/templates/nginx.conf.template
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
ENV PORT=80
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
EXPOSE 80
