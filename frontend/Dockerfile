# Zero Accident Prevention - operator web UI
#
# BUILD CONTEXT IS THE REPOSITORY ROOT, not frontend/.
#
# vite.config.ts aliases `@map-data` to ../map-data, so the corridor geometry
# and the 158 corridor facilities are imported from outside the Vite project
# root. A build context of frontend/ cannot see them and fails at resolve time.
#
# This produces a real production build served by nginx, rather than running
# Vite's dev server in the container. VITE_* values are compiled into the
# bundle, so they arrive as build args below - the deploy workflow runs
# `docker compose build` on every push, so a changed variable is picked up on
# the next deploy without any extra step.

# --- build ------------------------------------------------------------------
FROM node:20-bookworm-slim AS build

WORKDIR /srv/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

# Everything Vite needs to resolve imports and types.
COPY frontend/ ./
COPY map-data /srv/map-data

# Browser-facing configuration. These are baked into the bundle: anything set
# here is readable by anyone who loads the page, so only ever pass public,
# domain-restricted values.
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_MAPTILER_API_KEY
ARG VITE_MAP_STYLE
ARG VITE_MAP_STYLE_DARK
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_MAPTILER_API_KEY=$VITE_MAPTILER_API_KEY \
    VITE_MAP_STYLE=$VITE_MAP_STYLE \
    VITE_MAP_STYLE_DARK=$VITE_MAP_STYLE_DARK

# Fail loudly here rather than shipping a bundle whose map cannot load. Without
# a key the deployed page renders a configuration error and nothing else, which
# is a confusing way to discover an unset CI variable.
RUN test -n "$VITE_MAPTILER_API_KEY" \
  || (echo "ERROR: VITE_MAPTILER_API_KEY is empty. Set it in .env (locally) or as an Actions secret (CI); without it the basemap and 3D terrain cannot load." && exit 1)

RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /srv/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
