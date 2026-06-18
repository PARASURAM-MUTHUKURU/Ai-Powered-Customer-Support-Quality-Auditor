# Setup Guide for Running AuditAI on a Friend's Laptop 🚀

This guide provides step-by-step instructions to set up and run the AuditAI application on a new machine.

---

## ⚠️ CRITICAL WARNING: Environment Files (.env.local)

The `.env.local` files contain secret API keys (Gemini, Supabase, Qdrant, OpenAI, Twilio, etc.). Because these files are **git-ignored** (ignored by Git for safety), they **will not be copied** if you share the project via Git/GitHub.

**You must copy the environment files manually:**
1. Copy the file `backend/.env.local` to the `backend/` directory of the friend's laptop.
2. Copy the file `frontend/.env.local` to the `frontend/` directory of the friend's laptop.

*(Alternatively, if you copy the entire project folder using a USB drive or as a ZIP archive, the files will be copied over automatically).*

---

## 🛠️ Method 1: Running with Docker (Recommended & Easiest)

This is the fastest and most foolproof way. Docker will automatically install Python, Node.js, and PostgreSQL inside isolated containers so you don't have to install them manually on the host laptop.

### Prerequisites
* Install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** on the laptop and make sure it is running.

### Steps
1. Open a terminal (Command Prompt, PowerShell, or Bash) in the project root directory.
2. Build and start the services by running:
   ```bash
   docker compose up --build -d
   ```
3. Docker will download the required images, build the backend/frontend containers, and start:
   * **PostgreSQL Database** (hostname `db`, exposed on port `5432`)
   * **Qdrant Vector Database** (hostname `qdrant`, exposed on port `6333`)
   * **FastAPI Backend Server** (exposed on port `3000`)
   * **React/Vite Frontend** (exposed on port `80`)
4. Access the application in the web browser at:
   * **Frontend Interface**: [http://localhost](http://localhost)
   * **Backend API Docs**: [http://localhost:3000/docs](http://localhost:3000/docs)


To stop the containers later, run:
```bash
docker compose down
```

---

## 💻 Method 2: Running Locally (Manual Setup)

If Docker is not installed or you prefer to run everything directly on the laptop's OS, follow these steps.

### Prerequisites
* Install **[Python 3.10+](https://www.python.org/downloads/)**
* Install **[Node.js v18+](https://nodejs.org/)**
* Install **[PostgreSQL](https://www.postgresql.org/download/)**
* Install/run **[Qdrant Vector Database](https://qdrant.tech/documentation/quickstart/)** (either locally via `docker run -p 6333:6333 qdrant/qdrant` or as a standalone binary)


---

### Step 1: Database Setup
1. Open your PostgreSQL administration client (e.g., pgAdmin or psql shell).
2. Create a new database named `auditor_db`.
3. Open the `schema.sql` file located in the root of the project.
4. Execute the SQL queries inside `schema.sql` on the newly created `auditor_db` to set up all required database tables.

---

### Step 2: Backend Setup
1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. (Optional but recommended) Create and activate a Python virtual environment:
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate
     ```
   * **Mac/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install all required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify that `backend/.env.local` is present in the `backend/` directory.
5. Start the backend server:
   ```bash
   python main.py
   ```
   * The backend will start on **[http://localhost:3000](http://localhost:3000)** (or the port defined in `$env:PORT`).

---

### Step 3: Frontend Setup
1. Open a second terminal window and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Verify that `frontend/.env.local` is present in the `frontend/` directory.
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * The frontend will start and display the local URL (usually **[http://localhost:5173](http://localhost:5173)**). Open this URL in the web browser.

---

## 🔍 Troubleshooting Docker Errors

### 1. Conflict: Container name is already in use
If you get an error like:
```text
Conflict. The container name "/auditai-db" is already in use by container "6068ae4d69...". You have to remove (or rename) that container to be able to reuse that name.
```
This means an old or stopped Docker container is already using the name `auditai-db`. 

**How to Fix:**
Run the following command in the terminal to force remove the conflicting container:
```bash
docker rm -f auditai-db
```
*(If you also get name conflicts for `backend` or `frontend`, run: `docker rm -f backend frontend`)*

After running the cleanup command, restart with:
```bash
docker compose up --build -d
```
