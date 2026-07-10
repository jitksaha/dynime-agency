# 🚀 Hostinger Deployment Guide — Dynime.com

This guide deploys the full Dynime stack to Hostinger with your current local data.

---

## Architecture Overview

```
Hostinger Server
├── public_html/         ← Vite built frontend (static files)
├── dynime-backend/      ← NestJS API (Node.js app on port 3001)
│   ├── dist/            ← compiled TypeScript
│   ├── prisma/
│   └── .env
└── MySQL Database       ← your local data, imported
```

---

## STEP 1 — Export Local Database

The backup is already saved at `backend/scripts/dynime_prod_backup.sql`.

To refresh the backup anytime:
```bash
mysqldump -h 127.0.0.1 -u root --no-tablespaces --column-statistics=0 dynime_prod > backend/scripts/dynime_prod_backup.sql
```

---

## STEP 2 — Create MySQL Database on Hostinger

1. hPanel → **Databases → MySQL Databases**
2. Create database: `dynime_prod`
3. Create user: `dynime_user` with a strong password
4. Grant **all privileges** on `dynime_prod` to `dynime_user`

---

## STEP 3 — Import the Database

### Via phpMyAdmin (easiest)
1. hPanel → **Databases → phpMyAdmin** → select `dynime_prod`
2. **Import** tab → choose `backend/scripts/dynime_prod_backup.sql`
3. Click **Go**

### Via SSH
```bash
mysql -h localhost -u dynime_user -p dynime_prod < dynime_prod_backup.sql
```

---

## STEP 4 — Build Backend Locally

**Always build on your Mac, never on Hostinger (too little memory).**

```bash
cd backend
npm install
npm run build
```

This creates `backend/dist/`.

---

## STEP 5 — Upload Backend to Hostinger

Create a folder `dynime-backend` on your Hostinger server and upload:

```
dynime-backend/
├── dist/             ← upload this (built output)
├── prisma/           ← upload this
├── package.json      ← upload this
├── package-lock.json ← upload this
└── .env              ← create this manually (Step 7)
```

**Do NOT upload `node_modules/` from your Mac** — it's macOS binaries.
Instead, after upload, SSH into the server and run:
```bash
cd dynime-backend
npm install --omit=dev
npx prisma generate
```

---

## STEP 6 — Set Up Node.js App on Hostinger

1. hPanel → **Node.js** → **Create Application**
2. Settings:
   - **Node.js version**: `20.x`
   - **Application root**: `dynime-backend`
   - **Startup file**: `dist/main.js`
   - **Application mode**: Production

---

## STEP 7 — Create Production .env on Server

Via SSH or Hostinger File Manager, create `dynime-backend/.env`:

```env
NODE_ENV=production
PORT=3001
API_PREFIX=api
CORS_ORIGINS=https://dynime.com

DATABASE_URL=mysql://dynime_user:YOUR_DB_PASSWORD@localhost:3306/dynime_prod

JWT_ACCESS_SECRET=GENERATE_WITH_openssl_rand_-hex_32
JWT_REFRESH_SECRET=GENERATE_WITH_openssl_rand_-hex_32
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=200

REDIS_URL=

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=unused
MINIO_SECRET_KEY=unused
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=https://api.dynime.com

DIDIT_API_KEY=JpAneH1gvRQiHJsVFhLGFOq9eEi4ta4zFPSfkYJ92io
DIDIT_KYC_WORKFLOW_ID=95237f69-330d-4f29-bb56-ec732d086ea3
DIDIT_KYB_WORKFLOW_ID=4ba21347-54d5-4c45-ad8f-47fa501a8cc8
DIDIT_AML_WORKFLOW_ID=95237f69-330d-4f29-bb56-ec732d086ea3
```

Generate JWT secrets:
```bash
openssl rand -hex 32
```

---

## STEP 8 — Build & Upload Frontend

### Set production API URL first

Create `.env.production` in the project root (`dynime.com/`):
```env
VITE_API_URL=https://api.dynime.com/api/v1
```

### Build
```bash
# from project root (dynime.com/)
npm run build
```

This creates `dist/` in the project root.

### Upload to public_html
1. hPanel → **Files → File Manager** → open `public_html/`
2. Gear icon ⚙ → **Show hidden files**
3. Delete all existing files in `public_html/`
4. Upload **everything inside `dist/`** (not the dist folder itself)
5. Verify `.htaccess` exists in `public_html/`

---

## STEP 9 — Set Up API Subdomain

In hPanel → **Domains → Subdomains**:
- Create `api.dynime.com` pointing to the Node.js app port `3001`

Or in hPanel → **Node.js → your app** → set the **Application URL** to `api.dynime.com`.

---

## STEP 10 — Start & Verify

Start the Node.js app in hPanel → **Node.js** → **Start/Restart**.

Test:
| Check | URL |
|-------|-----|
| Frontend | https://dynime.com |
| Admin | https://dynime.com/superadmin |
| API health | https://api.dynime.com/api/v1/health |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Prisma binary not found` | Run `npx prisma generate` on the server after `npm install` |
| `Cannot find module dist/main` | Build locally first, then upload `dist/` |
| `ECONNREFUSED Redis` | Set `REDIS_URL=` (empty string) — app starts without Redis |
| `DATABASE_URL must be a string` | Ensure `.env` exists on server with `DATABASE_URL` set |
| CORS errors | Set `CORS_ORIGINS=https://dynime.com` exactly |
| 404 on `/superadmin` | Ensure `.htaccess` is in `public_html/` (show hidden files!) |
| Build OOM on server | Never build on Hostinger — always build locally |
