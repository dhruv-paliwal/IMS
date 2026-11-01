# Inventory AI (IMS) - Smart Inventory Management System

An AI-powered, Indian-market localized Inventory Management & Demand Forecasting System built with **Next.js (React 19)**, **Tailwind CSS**, and **FastAPI (Python)**.

---

## 🚀 Key Features

* **AI Demand Forecasting & Indian Festive Calendar Surges:** 30-day product demand projections with automatic demand surges for upcoming festivals (Diwali, Chhath Puja, Wedding Season).
* **Smart Clearance & Markdown Engine:** Automated expiry tracking that detects near-expiry items and recommends liquidation markdowns (15%-50% OFF) to prevent dead-stock losses.
* **Market Basket Analysis (AI Cross-Selling at Checkout):** Product association rules recommending high-affinity bundles (e.g., Basmati Rice + Desi Ghee & Cumin Seeds) directly inside POS billing.
* **Smart Scan & POS Billing:** Device camera barcode scanner (HTML5-QRCode) + instant image file barcode upload.
* **Analytics Dashboard:** Dual-axis Sales Trend & Forecast Bar Chart with Indian currency formatting (₹), recent transactions feed, and low-stock replenishment indicators.
* **Secure Authentication:** JWT-based user authentication with encrypted password hashing.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 16, React 19, Tailwind CSS, Recharts, Lucide Icons, Axios.
* **Backend:** FastAPI, SQLAlchemy, Pydantic, Passlib (Bcrypt), PyJWT.
* **Database:** SQLite (local development) / PostgreSQL (production on Render).

---

## 💻 Local Setup Instructions

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python seed.py        # Seeds initial products and 30-day realistic sales
uvicorn main:app --reload --port 8000
```
API Documentation will be live at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the application at: `http://localhost:3000`

---

## ☁️ Deployment Guide (Render & Vercel)

### Option A: Recommended Hybrid Deployment (Vercel Frontend + Render Backend)

#### 1. Deploy Backend on Render (Free)
1. Go to [Render.com](https://render.com) and create a **Web Service**.
2. Connect your GitHub repository (`IMS`).
3. Set the **Root Directory** to `backend`.
4. Configure:
   * **Runtime:** Python 3
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. *(Optional)* Add a free **Render PostgreSQL Database** and link its `Internal Database URL` as an environment variable named `DATABASE_URL`.
6. Copy your live backend URL (e.g., `https://ims-backend.onrender.com`).

#### 2. Deploy Frontend on Vercel (Free)
1. Go to [Vercel.com](https://vercel.com) and import your `IMS` repository.
2. Set the **Root Directory** to `frontend`.
3. Under **Environment Variables**, add:
   * `NEXT_PUBLIC_API_URL` = `https://ims-backend.onrender.com`
4. Click **Deploy**. Vercel will deploy the Next.js frontend in under a minute with free global CDN and HTTPS!

---

### Option B: Full-Stack on Render
1. Create a Web Service for `backend` as described above.
2. Create a second Web Service for `frontend`:
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Start Command:** `npm start`
   * **Environment Variable:** `NEXT_PUBLIC_API_URL` = your backend Render URL.
