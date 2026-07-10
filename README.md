# AI Job Outreach Assistant

AI Job Outreach Assistant is a complete full-stack web application designed for personal use. It automates importing recruiter contact databases, using OpenAI to write highly personalized cold outreach emails matching candidate resumes and roles, presenting interactive outbox preview stages, and sequentially sending emails via the official Google Gmail API (using OAuth 2.0) with random anti-spam delays.

---

## Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS (v4) + Lucide Icons + React Router + React Hook Form
- **Backend**: Node.js + Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL (Neon Serverless PostgreSQL recommended)
- **AI Integration**: OpenAI API (with easy extensibility)
- **Email Delivery**: Google Gmail API (via secure OAuth 2.0 token exchanges)

---

## Folder Structure

```text
/SendEmail
  ├── backend/
  │    ├── prisma/
  │    │    └── schema.prisma        # Database schema
  │    ├── src/
  │    │    ├── routes/              # Express API endpoints
  │    │    ├── services/            # Gmail OAuth & sending engine queues
  │    │    ├── utils/               # Encryption and Logging helpers
  │    │    └── index.ts             # App server entrypoint
  │    ├── tsconfig.json
  │    └── .env                      # API keys & Database URL
  │
  ├── frontend/
  │    ├── src/
  │    │    ├── components/          # Shared components (Sidebar, Importer wizard)
  │    │    ├── pages/               # Views (Dashboard, Settings, Outbox)
  │    │    ├── types/               # Type definitions
  │    │    ├── App.tsx              # Router mapping
  │    │    └── main.tsx
  │    ├── tailwind.config.js
  │    ├── postcss.config.js
  │    └── vite.config.ts            # Proxy server settings
```

---

## Environment Variables Configuration

Create a `.env` file in the `backend/` directory by copying `.env.template` and filling in the values.

```ini
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database Connection (Neon Serverless PostgreSQL connection string)
DATABASE_URL="postgresql://username:password@your-neon-hostname.neon.tech/neondb?sslmode=require"

# Token Encryption (32-byte hex key: 64 hex characters)
# Generate via: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=9a7c36a4be9efcfd530f2c4e5187d908ef94bfa25651c6decfb99db10b271d47

# Google OAuth 2.0 Credentials (Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# OpenAI AI API Key
OPENAI_API_KEY=your_openai_api_key_here
```

---

## Step-by-Step Setup Guides

### 1. Neon PostgreSQL Database Setup
1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Create a new project (e.g., `JobOutreach`).
3. Under the **Dashboard**, copy the provided **connection string** (make sure pooler option is set or standard connection string).
4. Update the `DATABASE_URL` field in `backend/.env` with your connection string.

### 2. Google OAuth & Gmail API Console Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `Job Outreach Assistant`).
3. Search for **Gmail API** in the API library and click **Enable**.
4. Go to **OAuth Consent Screen**:
   - Set User Type to **External**.
   - Fill in developer contact details and application name.
   - In the **Scopes** page, add:
     - `.../auth/gmail.send` (Send messages on your behalf)
     - `.../auth/userinfo.email` (View your email address)
   - Add your own email address as a **Test User** (since the app remains in Testing mode, only added test users can log in).
5. Go to **Credentials**:
   - Click **Create Credentials** -> **OAuth Client ID**.
   - Application Type: **Web application**.
   - Under **Authorized redirect URIs**, add: `http://localhost:5000/api/auth/google/callback`.
   - Save and copy the generated **Client ID** and **Client Secret** into `backend/.env`.

### 3. OpenAI Developer Setup
1. Go to [OpenAI Platform](https://platform.openai.com/).
2. Generate an API Key under **API keys**.
3. Copy the key and paste it as `OPENAI_API_KEY` in `backend/.env`.

---

## Installation & Running Locally

### Step 1: Install dependencies and synchronize schema
Run these commands from your root terminal:

```bash
# Setup backend database & packages
cd backend
npm install
npx prisma db push       # Syncs your Neon database directly with the schema

# Setup frontend packages
cd ../frontend
npm install
```

### Step 2: Spin up the development environment

Open two terminal sessions or use a process runner:

#### Terminal 1: Launch Backend Server
```bash
cd backend
npm run dev
```
*App launches on `http://localhost:5000` and starts checking active outbox tasks.*

#### Terminal 2: Launch Frontend Client
```bash
cd frontend
npm run dev
```
*App launches a server on `http://localhost:5173`.*

---

## Core Application Workflow

1. **Configurations Setup**:
   - Open settings, click **Connect Gmail Account** to authenticate your credentials via Google Sign-In.
   - Enter your personal profile parameters (GitHub, Preferred Role, Target Salary, etc.).
   - Configure your Custom Prompts and outbox queue delays.
2. **Resume Setup**:
   - Go to **Resumes** tab and upload your target PDFs (e.g., frontend-focused, backend-focused resumes) and mark one as default.
3. **Campaign Setup**:
   - Create a campaign (e.g., "July Startups") and attach a target resume.
   - Import target contacts using the **Import Wizard** (CSV file drag & drop, raw email pasted strings, or manually inputted forms).
4. **AI Generation**:
   - In the Campaign management screen, click **AI Gen Email**. The backend processes emails using OpenAI in the background, merging contact fields with candidate settings.
5. **Outbox Review**:
   - Open the **Outbox** tab. Step through generated pitches. You can make adjustments, regenerate using AI, copy details, or skip.
6. **Sending engine**:
   - Start the Campaign. The background engine checks for ready emails, attaches your PDF resume, sends through the Gmail API, and waits a random interval (e.g., 30–90 seconds) before sending the next to protect your Gmail reputation.

---

## Production Deployment Guide

You can host the application on cloud platforms. This guide outlines how to deploy the **Backend on Render** and the **Frontend on Vercel**.

### Step 1: Deploy Backend to Render

1. Go to [Render.com](https://render.com/) and create a free account.
2. Click **New +** -> **Web Service**.
3. Connect your Git repository (GitHub/GitLab) where the project is pushed.
4. Configure the Web Service settings:
   - **Name**: `job-outreach-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Click **Advanced** and add the following **Environment Variables**:
   - `DATABASE_URL`: *Your Neon PostgreSQL connection string.*
   - `ENCRYPTION_KEY`: *A secure 64-character hex key.*
   - `GOOGLE_CLIENT_ID`: *Your Google OAuth Client ID.*
   - `GOOGLE_CLIENT_SECRET`: *Your Google OAuth Client Secret.*
   - `GOOGLE_REDIRECT_URI`: `https://YOUR-BACKEND-NAME.onrender.com/api/auth/google/callback`
   - `FRONTEND_URL`: `https://YOUR-FRONTEND-NAME.vercel.app`
   - `GROK_API_KEY`: *Your xAI API Key.*
   - `GROK_MODEL`: `grok-2-1212`
6. Click **Create Web Service**. Once deployed, copy your Render Web Service URL (e.g., `https://job-outreach-backend.onrender.com`).

### Step 2: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com/) and connect your Git repository.
2. Open the [frontend/vercel.json](file:///Users/aditya/Desktop/SendEmail/frontend/vercel.json) file and update the `destination` property to point to your deployed backend Render URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://YOUR-BACKEND-NAME.onrender.com/api/:path*"
       },
       ...
     ]
   }
   ```
3. Commit and push the changes to your repository.
4. On Vercel dashboard, click **Add New** -> **Project**.
5. Select your repository.
6. Configure Project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
7. Click **Deploy**. Vercel will build and host your React app (e.g., `https://job-outreach-frontend.vercel.app`).

### Step 3: Align Google Cloud Console Credentials
Now that you have your production domains:
1. Go back to the [Google Cloud Console](https://console.cloud.google.com/) -> **Credentials**.
2. Edit your OAuth Client ID:
   - In **Authorized JavaScript origins**, add your Vercel URL: `https://YOUR-FRONTEND-NAME.vercel.app`
   - In **Authorized redirect URIs**, add your production callback URL: `https://YOUR-BACKEND-NAME.onrender.com/api/auth/google/callback`
3. Click **Save**.

