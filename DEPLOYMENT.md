# Dynime Production Deployment & Update Guide

This guide explains how to deploy the Dynime platform (Vite React frontend & NestJS backend) to production and how to manage updates, database migrations, and feature modifications in the future.

---

## 1. Architecture Overview

Dynime is structured as a modern web application:
- **Frontend**: Vite SPA (React + TypeScript) served via CDN/Nginx.
- **Backend**: NestJS API (Node.js + Prisma) connecting to PostgreSQL, Redis (queues & cache), and Object Storage (Cloudflare R2 or S3-compatible).

---

## 2. Option A: Vercel + Railway (Recommended)

This is the easiest, most robust setup for zero-downtime deployments and auto-updates.

### A. Deploy Frontend on Vercel
1. Sign up on [Vercel](https://vercel.com) and click **Add New → Project**.
2. Connect your GitHub repository and select the root directory.
3. Configure the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables:
   - `VITE_API_URL`: Set this to your backend API URL (e.g., `https://api.dynime.com/api/v1`).
5. Click **Deploy**. Vercel will automatically build and deploy your frontend. Every time you push to the `main` branch, Vercel will auto-update the live website.

### B. Deploy Backend on Railway
1. Sign up on [Railway.app](https://railway.app).
2. Click **New Project → Deploy from GitHub repo**.
3. Select your repository, and in settings set the **Root Directory** to `backend`.
4. Configure the environment variables (see `.env.example`):
   - `DATABASE_URL`: Your production PostgreSQL connection string (e.g. from Neon.tech).
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Secure random strings.
   - `REDIS_URL`: URL of your Redis instance (Railway provides a Redis service plug-in).
   - `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`: Set to your Cloudflare R2 or AWS S3 credentials.
5. Railway will automatically deploy the backend and rebuild on every GitHub push.

---

## 3. Option B: VPS Deployment (Hetzner / Hostinger)

If you prefer full VPS control using Docker Compose:

### A. Initial VPS Setup
SSH into your Ubuntu server:
```bash
ssh root@your-vps-ip
```

Install Git, Docker, and Docker Compose:
```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### B. Clone and Run Stack
1. Clone your GitHub repository on the VPS:
   ```bash
   git clone https://github.com/yourusername/dynime.git /app
   cd /app
   ```
2. Copy the deploy environment file and fill in all secret values:
   ```bash
   cp deploy/.env.example deploy/.env
   nano deploy/.env
   ```
3. Start the application stack using Docker Compose:
   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build
   ```
   This command builds the frontend & backend images, and starts PostgreSQL, Redis, MinIO, NestJS, and Nginx.

4. Setup Nginx SSL certificates using Certbot:
   ```bash
   sudo apt install -y certbot
   sudo certbot certonly --standalone -d dynime.com -d api.dynime.com
   ```

---

## 4. Future Updates & Version Control System

To update the system safely in the future without causing bugs or downtime, use this git workflow:

### A. Git Branching Model
1. **`main` / `production`**: This branch is connected to your production servers. Do not commit directly to this branch.
2. **`development` / `dev`**: Used for testing new features before launching them.
3. **`feature/feature-name`**: Create a separate branch for every new feature (e.g., `feature/referral-system`):
   ```bash
   git checkout -b feature/referral-system
   ```

### B. Deploying Future Updates
Once a feature is tested locally:
1. Merge the feature branch into `development` and test.
2. Merge `development` into `main`:
   ```bash
   git checkout main
   git merge development
   git push origin main
   ```
3. **Auto-Deploy on Vercel/Railway**: If using Option A, Vercel and Railway will automatically rebuild and deploy the updates instantly.
4. **Auto-Deploy on VPS**: If using Option B, your GitHub Actions pipeline will automatically trigger the update script on your VPS.

---

## 5. Adding & Removing Features (Modular NestJS Architecture)

To add or remove features in the backend:
1. **Modules**: NestJS uses modular structures under `backend/src/`. To disable a module (e.g. `referral`), open `backend/src/app.module.ts` and remove/comment out its entry in the `imports` array:
   ```typescript
   @Module({
     imports: [
       AuthModule,
       OrdersModule,
       // ReferralModule, <-- comment out to disable
     ],
   })
   ```
2. **Database Schema updates**: If a feature adds new columns to the database:
   - Edit `backend/prisma/schema.prisma`.
   - Run a migration to sync the database schema:
     ```bash
     npx prisma db push
     ```
   - Regenerate the Prisma client:
     ```bash
     npx prisma generate
     ```
