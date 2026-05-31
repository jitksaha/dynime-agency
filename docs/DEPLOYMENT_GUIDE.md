# Dynime — Self-Hosted Deployment Guide

Target stack: **Docker Compose** orchestrating Postgres, Redis, MinIO, the NestJS
backend, the built React frontend, and an Nginx gateway.

> These services are for **your own server / VPS** (e.g. Hostinger). They are not
> run on Replit (which is the development environment only).

## 1. Prerequisites
- A Linux host with Docker + Docker Compose v2.
- DNS records pointing your domain (and optionally `files.` for MinIO) to the host.
- The migration completed (see `ROLLBACK_GUIDE.md` / `migration/`).

## 2. Configure environment
```bash
cd deploy
cp .env.example .env
# Edit .env: set strong POSTGRES_PASSWORD, JWT secrets, MINIO keys,
# CORS_ORIGINS=https://yourdomain.com, VITE_API_BASE_URL=/api
```

## 3. Build & start
```bash
docker compose --env-file .env up -d --build
```
Services:
| Service | Port | Purpose |
|---|---|---|
| gateway (nginx) | 80 | public entrypoint: serves SPA, proxies `/api`, `/docs` |
| frontend | internal | static React bundle |
| backend | internal 3001 | NestJS API |
| postgres | 5432 | database |
| redis | 6379 | cache + BullMQ |
| minio | 9000 / 9001 | object storage / console |

## 4. Load data (first deploy)
```bash
# from repo root, with SUPABASE_DB_URL + TARGET_DATABASE_URL + MinIO env set
cd migration
./backup.sh                 # dump Supabase (read-only)
TARGET_DATABASE_URL=postgresql://dynime:...@HOST:5432/dynime ./restore.sh
node export-storage.mjs     # files -> MinIO
./verify.sh                 # row-count parity check
```

## 5. TLS
Terminate TLS at the gateway with your preferred method (Let's Encrypt via
`certbot`, or a Caddy/Traefik front). Update `deploy/nginx/gateway.conf` to add a
443 server block and certificate paths.

## 6. Health & docs
- Health: `https://yourdomain.com/api/v1/health`
- Swagger: `https://yourdomain.com/docs`

## 7. Backups (ongoing)
Schedule `pg_dump` of the target Postgres and MinIO bucket snapshots via cron;
keep off-host copies. See `ROLLBACK_GUIDE.md` for restore procedure.
