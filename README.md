# ZeroLeak Print — Encrypted Zero-Trust Document Handoff Vault

**ZeroLeak Print** is an encrypted, zero-trust document handoff and secure printing vault application. It allows customers to hand off sensitive files (contracts, identity documents, passports, financial records) to print shops via short-lived, ephemeral **Print IDs** without leaving permanent copies on print shop machines.

---

## 🔒 Key Security Features

- **Ephemeral Access Windows**: Documents expire automatically after a maximum 10-minute window.
- **Client-Side AES-256-GCM Encryption**: Files are encrypted before leaving the client browser.
- **Zero Persistent Disk Storage**: Document bytes stream strictly into transient RAM and are automatically shredded upon print execution or expiration.
- **Hardware-Isolated Operator Sandbox**: Print operators access documents in a read-only sandbox with zero download, export, or right-click capabilities.
- **Built-in IDOR & Abuse Protection**: Full multi-tenant isolation, rate-limiting on authentication and Print ID verification, and malicious scanner blocking.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic, Passlib (bcrypt), PyJWT.
- **Frontend**: React 19, Vite, React Router DOM, TailwindCSS v4, Lucide Icons.
- **Database**: SQLite (Development) / PostgreSQL (Production).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*Backend server runs at `http://localhost:8000`.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend app runs at `http://localhost:5173`.*

---

## 🧪 Running Security & Verification Test Suites

The backend includes 6 automated verification suites inside `backend/scripts/`:

```bash
cd backend

# 1. Secret Scanning Test
python scripts/test_secret_scan.py

# 2. Input Validation & XSS Sanitization Test
python scripts/test_input_validation.py

# 3. IDOR & Multi-Tenant Isolation Test
python scripts/test_idor_security.py

# 4. Deployment & Audit Logging Test
python scripts/test_deployment_logging.py

# 5. Authentication & Rate-Limiting Test
python scripts/test_auth_security.py

# 6. Abuse & Scanner Protection Test
python scripts/test_abuse_protection.py
```

---

## 📂 Project Structure

```text
secure/
├── backend/
│   ├── app/                # FastAPI application routes, schemas, models & security
│   ├── scripts/            # Automated security & verification test suites
│   ├── requirements.txt    # Python dependencies
│   └── run.py              # Server entry point
├── frontend/
│   ├── src/                # React components, pages, context & routes
│   ├── public/             # Static assets
│   ├── package.json        # Frontend dependencies & scripts
│   └── vite.config.js      # Vite configuration
├── .gitignore              # Git ignore rules for secrets, DBs, logs & node_modules
├── .env.example            # Environment variable schema
└── README.md               # Main project documentation
```

---

## 📜 License & Compliance

Designed with privacy-first zero-knowledge standards. Files are purged from RAM immediately post-execution.
