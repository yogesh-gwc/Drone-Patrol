# Deploying Zero Accident Prevention

NH-44 Krishnagiri → Hosur drone patrol simulation. Two containers, no database.

| Service | Port | Public name |
| --- | --- | --- |
| `zap-backend` | 4000 | `zero-accident-api.<PUBLIC_HOST>` |
| `zap-web` | 80 | `zero-accident.<PUBLIC_HOST>` |

Pushing to `main` deploys. The runner writes `.env` from this repository's
Actions variables and secrets, rebuilds both images and restarts the stack —
there is no manual step on the server.

---

## 1. One-time setup on the runner host

The stack assumes Traefik is already running and routing by hostname, exactly
as the other GWC stacks on that box do.

```bash
docker network create webproxy
```

Traefik must watch that network and expose:

- a `web` entrypoint (HTTP)
- a `websecure` entrypoint (HTTPS) with a `letsencrypt` certresolver

Both hostnames must resolve to the Traefik host before a deploy is useful:

```
zero-accident.<PUBLIC_HOST>
zero-accident-api.<PUBLIC_HOST>
```

## 2. One-time setup in GitHub

**Settings → Environments → New environment → `deployment`**

Variables:

| Name | Example | Notes |
| --- | --- | --- |
| `PUBLIC_HOST` | `internal.gwcdata.ai` | DNS suffix both names sit under |
| `PUBLIC_SCHEME` | `https` | `http` only if Traefik has no TLS here |
| `BACKEND_PORT` | `4000` | Container-internal; not published |
| `VITE_MAP_STYLE` | `streets-v2-light` | Light is the product default |
| `VITE_MAP_STYLE_DARK` | `streets-v2-dark` | |

Secrets:

| Name | Notes |
| --- | --- |
| `VITE_MAPTILER_API_KEY` | Required. Restrict it to `PUBLIC_HOST` in the MapTiler console |

The runner label set is `[self-hosted, linux, gwc-server]`. If the office
runner carries different labels, change `runs-on:` in
`.github/workflows/deploy.yml` to match or the job will queue forever.

## 3. Deploy

Push to `main`, or run the workflow manually from the Actions tab
(`workflow_dispatch` is enabled, so a variable change can be applied without an
empty commit).

The workflow: writes `.env` → checks the required values are actually set →
ensures the `webproxy` network exists → `docker compose build` →
`docker compose up -d` → polls `/api/health` until the backend answers → prunes
dangling images.

---

## Things that will bite you

**The two hostnames must share a scheme.** This is the one non-obvious
constraint in the whole setup. Unlike the reference stack this is modelled on —
where the web container calls its backend server-side over the Docker network —
the operator UI here talks to the backend **directly from the browser**, both
for REST and for the Socket.IO websocket. Serve the UI over HTTPS and the API
over HTTP and every call is blocked as mixed content: the map renders, the
corridor draws, and no telemetry ever arrives. Nothing logs an error the
operator would recognise. `PUBLIC_SCHEME` drives both, so keep it that way.

**`VITE_*` values are compiled into the bundle.** They are build args, not
runtime environment. Changing one means rebuilding the web image — which the
workflow does on every deploy, so in practice you change the variable and
redeploy. It also means anything in a `VITE_*` value is readable by anyone who
loads the page. The MapTiler key is a public client key, which is fine, but
restrict it by domain. Never put a server secret there.

**Both images build from the repository root.** The backend resolves
`map-data/` three levels up from its compiled module, and the frontend aliases
`@map-data` to `../map-data`. A build context of `backend/` or `frontend/`
alone cannot see that directory: the backend image would start and then die on
its first read of `nh44-corridor.geojson.json`, and the frontend build would
fail at import resolution. The container layout mirrors the repo —
`/srv/backend`, `/srv/frontend`, `/srv/map-data` — for exactly this reason.

**`backend/data/speedViolations.json` is runtime output.** The engine appends
every E-Challan it issues and reads the file back on boot. It is git-ignored,
so a fresh clone and a fresh image both start with an empty log — that is
intended. It also means the log does not survive a container rebuild; if the
count needs to persist across deploys, add a named volume for
`/srv/backend/data`.

**The camera clips are ~46 MB of the repo.** `frontend/public/*.mp4` is copied
into the web image. It is the largest part of both the build context and the
clone.

---

## Running the stack locally

```bash
cp .env.example .env      # then set VITE_MAPTILER_API_KEY
docker network create webproxy
docker compose up -d --build
docker compose ps
```

Without Traefik in front, add `ports:` to the two services to reach them
directly — the compose file deliberately publishes none, so that concurrent
stacks on one host cannot collide over ports.

Plain development, no Docker, is unchanged:

```bash
cd backend  && npm install && npm run dev     # :4000
cd frontend && npm install && npm run dev     # :5173
```

`frontend/.env` still drives that path and is ignored by Docker.
