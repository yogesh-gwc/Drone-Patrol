# Zero Accident Prevention - simulation backend
#
# BUILD CONTEXT IS THE REPOSITORY ROOT, not backend/.
#
# The engine resolves its geographic reference data three levels up from the
# compiled module (backend/dist/simulation/corridor.js -> repo root), so
# map-data/ has to sit beside backend/ at runtime exactly as it does in the
# repo. Building from backend/ alone produces an image that starts and then
# dies on the first read of nh44-corridor.geojson.json.
#
# The layout below preserves that relationship: /srv/backend and /srv/map-data.

# --- build ------------------------------------------------------------------
FROM node:20-bookworm-slim AS build

WORKDIR /srv/backend

# Dependencies first so a source-only change does not reinstall them.
COPY backend/package.json backend/package-lock.json* ./
# `npm ci` is strict and aborts when package.json has a dependency the lockfile
# does not, which turns "added a dependency" into a hard build failure until
# someone regenerates the lock. Fall back to `npm install`.
RUN npm ci || npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /srv/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY --from=build /srv/backend/dist ./dist

# Static configuration read at startup: drones, zones, stations, the dashboard
# baseline. Read-only as far as the app is concerned.
COPY backend/data ./data

# Real OSM corridor geometry and facilities, resolved from the repo root.
COPY map-data /srv/map-data

# Run as a non-root user. backend/data must stay writable: the enforcement code
# appends each E-Challan it issues to data/speedViolations.json. That file is
# git-ignored, so a fresh image has none and the engine starts an empty log.
RUN groupadd --system app \
  && useradd --system --gid app --home-dir /srv/backend app \
  && chown -R app:app /srv/backend
USER app

EXPOSE 4000

CMD ["node", "dist/server.js"]
