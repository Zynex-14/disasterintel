# DisasterIntel — Production Hosting & Deployment Guide

This guide provides turn-key, step-by-step instructions to host **DisasterIntel** across multiple cloud environments, from **100% Free Cloud Tiers** to **Enterprise VPS Docker** deployments and **Instant Public Tunnels**.

---

## 🎯 Choose Your Hosting Path

| Hosting Option | Cost | Best For | Setup Time |
|---|---|---|---|
| **Option A: Free Cloud (Render + Vercel)** | **$0 / Free** | Portfolios, Demos, GitHub projects | ~5 minutes |
| **Option B: Single-Server VPS (Docker Compose)** | ~$4–$6 / mo | Production, High Performance, Custom Domain | ~3 minutes |
| **Option C: Instant Public Tunnel (Cloudflare / ngrok)** | **$0 / Free** | Immediate live sharing from your machine right now | ~1 minute |
| **Option D: Serverless Containers (GCP Cloud Run / AWS)** | Pay-per-use | Enterprise Scalability & Security | ~10 minutes |

---

## 🌐 Option A: 100% Free Cloud Hosting (Render + Vercel)

This is the most popular, zero-cost architecture. You deploy the **FastAPI Backend** on Render and the **React Vite Frontend** on Vercel.

### Step 1: Push Project to GitHub
1. If not already done, push this project repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "feat: DisasterIntel 10/10 Enterprise Release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/disasterintel.git
   git push -u origin main
   ```

### Step 2: Deploy Backend to Render (Free Tier)
1. Go to [Render.com](https://render.com) and sign in with GitHub.
2. Click **New +** $\to$ **Web Service**.
3. Connect your `disasterintel` repository.
4. Fill in the following settings:
   - **Name**: `disasterintel-api`
   - **Region**: Singapore (or nearest to your audience)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
5. Click **Advanced** $\to$ **Add Environment Variable**:
   - `APP_ENV` = `production`
   - `CORS_ORIGINS` = `["*"]`
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://disasterintel-api.onrender.com`).

*(Alternative: You can simply click **New +** $\to$ **Blueprint** on Render and select the included [render.yaml](../render.yaml) for 1-click automatic setup!)*

### Step 3: Deploy Frontend to Vercel (Free Tier)
1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** $\to$ **Project**.
3. Import your `disasterintel` repository.
4. Configure Project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables**:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://disasterintel-api.onrender.com/api/v1` *(use your Render URL from Step 2)*
6. Click **Deploy**.
7. In ~45 seconds, your application will be live at `https://disasterintel.vercel.app`!

---

## 🐳 Option B: Single-Server VPS (Docker Compose)

Deploy on any Linux VM (DigitalOcean Droplet, AWS EC2, Hetzner, GCP Compute Engine, Linode).

### Requirements
- A VPS running Ubuntu 22.04 or Debian 12
- Docker & Docker Compose installed (`apt install docker.io docker-compose-v2 -y`)

### 1-Command Deployment
1. Clone the repository onto your server:
   ```bash
   git clone https://github.com/<your-username>/disasterintel.git
   cd disasterintel
   ```

2. Launch both Backend and Frontend containers:
   ```bash
   docker compose up --build -d
   ```

3. Verification:
   ```bash
   docker compose ps
   ```
   Both `disasterintel-backend` and `disasterintel-frontend` will be healthy.

4. Access your live platform:
   - **Web UI**: `http://<your-server-ip>` or `http://<your-server-ip>:5173`
   - **API Docs**: `http://<your-server-ip>:8000/api/v1/docs`

### Production HTTPS (Let's Encrypt SSL)
If you have a domain name (e.g. `disasterintel.example.com` pointing to your server IP), enable SSL with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d disasterintel.example.com
```

---

## ⚡ Option C: Instant Public Sharing from your PC (No Server Required)

If your local dev servers are already running (`http://127.0.0.1:5173` and `http://127.0.0.1:8000`), you can share a live, secure HTTPS link with anyone in the world right now using **Cloudflare Tunnels**:

### Using Cloudflare Tunnels (100% Free, No Account Needed):
1. Download `cloudflared` for Windows/Mac/Linux:
   ```powershell
   # Windows PowerShell (via winget or direct download)
   winget install Cloudflare.cloudflared
   ```
2. In your terminal, run:
   ```powershell
   cloudflared tunnel --url http://127.0.0.1:5173
   ```
3. Cloudflare will output a public HTTPS address like:
   `https://random-words.trycloudflare.com`
4. Anyone on the internet can open that link and interact with DisasterIntel live!

*(Alternative using ngrok: `ngrok http 5173`)*

---

## ☁️ Option D: Google Cloud Run (Serverless Container)

If you prefer enterprise Google Cloud Platform:

1. Build & Push Backend Container to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/<PROJECT_ID>/disasterintel-backend ./backend
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy disasterintel-api \
       --image gcr.io/<PROJECT_ID>/disasterintel-backend \
       --platform managed \
       --region asia-south1 \
       --allow-unauthenticated
   ```
3. Deploy Frontend container passing the backend URL:
   ```bash
   gcloud builds submit --tag gcr.io/<PROJECT_ID>/disasterintel-frontend ./frontend
   gcloud run deploy disasterintel-web \
       --image gcr.io/<PROJECT_ID>/disasterintel-frontend \
       --platform managed \
       --region asia-south1 \
       --allow-unauthenticated
   ```

---

## 🛡️ Pre-Flight Verification Checklist Before Launch

Before sharing your live link, verify all operational tests:
- [x] Backend Healthcheck: `GET /api/v1/health` returns status `online`.
- [x] Statutory Protocol: `GET /api/v1/alerts/cap.xml` returns OASIS CAP v1.2 XML.
- [x] Doppler Radar Network: `GET /api/v1/weather/radar/sites` returns Chennai & Karaikal DWR.
- [x] ML Blending & XAI: `GET /api/v1/forecast/explain` returns SHAP factor attributions.
- [x] WMO Verification Scorecard: Displays CSI $\ge 0.85$ and FAR $\le 0.12$.
- [x] Frontend Build: `npm run build` compiled without warnings or broken dependencies.
