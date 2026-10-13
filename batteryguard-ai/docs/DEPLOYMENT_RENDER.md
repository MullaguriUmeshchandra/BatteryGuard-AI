# 🚀 Deploying BatteryGuard AI to Render

BatteryGuard AI is pre-configured for seamless deployment to [Render](https://render.com). You can deploy using either **1-Click Blueprint (Recommended)**, **Render Dashboard (Manual)**, or as a **Single Unified Docker Service**.

---

## ⚡ Option 1: 1-Click Blueprint (Recommended)

Render Blueprints use the [`render.yaml`](file:///render.yaml) file in the root of this repository to configure both the FastAPI Backend and the React Vite Frontend automatically.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure Render Blueprint deployment"
   git push origin main
   ```
2. **Log in to Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
3. **Create a Blueprint**:
   - In the top-right corner, click **New +** → **Blueprint**.
   - Connect your GitHub repository: `BatteryGuard-AI`.
   - Render will detect [`render.yaml`](file:///render.yaml) and automatically display:
     - `batteryguard-backend` (FastAPI Web Service - Python)
     - `batteryguard-frontend` (React Vite Static Site - CDN)
4. **Deploy**:
   - Click **Apply**.
   - Render will build and deploy both services!
5. **Set Frontend API URL**:
   - Once the backend finishes deploying, copy its Render URL (e.g. `https://batteryguard-backend-xxxx.onrender.com`).
   - Go to your `batteryguard-frontend` service in Render → **Environment** tab.
   - Set `VITE_API_BASE` to `https://batteryguard-backend-xxxx.onrender.com/api`.
   - Click **Save Changes** (Render will automatically re-deploy the frontend).

---

## 🛠️ Option 2: Manual Dashboard Setup (Web Service + Static Site)

If you prefer to configure the services manually in the Render UI:

### 1. Deploy the Backend Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `batteryguard-backend`
   - **Root Directory**: `batteryguard-ai/backend`
   - **Environment / Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
4. In the **Environment Variables** section, add:
   - `PYTHON_VERSION`: `3.11.9`
   - `SECRET_KEY`: *(Click Generate or paste a secure random string)*
   - `DATABASE_URL`: `sqlite:///./batteryguard.db`
   - `CORS_ORIGINS`: `["*"]`
5. Click **Create Web Service**.
6. Note your backend URL once live: e.g. `https://batteryguard-backend.onrender.com`.

### 2. Deploy the Frontend Static Site
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `batteryguard-frontend`
   - **Root Directory**: `batteryguard-ai/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Redirects/Rewrites**:
   - Add a rewrite rule for client-side routing (SPA):
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: `Rewrite`
5. In the **Environment Variables** section, add:
   - `VITE_API_BASE`: `https://your-backend-name.onrender.com/api`
6. Click **Create Static Site**.

---

## 🐳 Option 3: Unified Docker Web Service (Single Free Service)

If you prefer running both the frontend and backend in a **single service** to maximize Render free tier hours:

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure:
   - **Name**: `batteryguard-ai`
   - **Environment / Runtime**: `Docker`
   - **Root Directory**: *(Leave empty / root)*
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: `Free`
4. In the **Environment Variables** section, add:
   - `SECRET_KEY`: *(Generated secure random string)*
5. Click **Create Web Service**.
   - Render will use the multi-stage [`Dockerfile`](file:///Dockerfile) to build the React frontend and serve both the frontend and API under a single unified URL!

---

## 🔑 Post-Deployment Verification

Once deployed, visit your frontend URL:
- Default Lead Engineer Login: `admin@batteryguard.ai` / `Admin@123456`
- Default Screening Technician Login: `tech@batteryguard.ai` / `Tech@123456`
- Health check endpoint: `https://<backend-url>/api/health`
- Swagger documentation: `https://<backend-url>/docs`
