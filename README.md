# AI Document Scanner (KTP & STNK)

An intelligent document processing system built for secure and highly accurate Optical Character Recognition (OCR) and data extraction. This system is designed for modern enterprise environments, featuring a Next.js frontend/backend-for-frontend and an isolated Python OCR microservice. 

## System Architecture

The project is structured as a monorepo consisting of two primary services:
1. **Web App (apps/web)**: Next.js application handling the user interface, database interactions (Prisma), LLM-based validation (Groq), and API routing.
2. **OCR Service (apps/ocr-service)**: Python FastAPI microservice utilizing PaddleOCR for high-precision text extraction.

## Prerequisites

Ensure the following dependencies are installed on your local machine:
- Node.js (v18.x or higher)
- Python (v3.10 or higher)
- npm or yarn

## Environment Setup

### 1. Web App Environment Configuration
Navigate to the web app directory and create the environment configuration file:
```bash
cd apps/web
copy .env.example .env
```

Define the following required variables in `apps/web/.env`:
```env
# Database Configuration (SQLite for local development)
DATABASE_URL="file:./dev.db"

# LLM Provider Configuration (Groq)
GROQ_API_KEY="your_groq_api_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"

# OCR Microservice Connection
OCR_SERVICE_URL="http://127.0.0.1:8000"
```

## Installation & Setup

### 1. OCR Service Setup (Python Backend)
Initialize and start the Python OCR microservice. It is recommended to use a virtual environment.

```bash
cd apps/ocr-service

# Create and activate virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the OCR service
uvicorn main:app --host 0.0.0.0 --port 8000
```
The OCR service will run locally at `http://127.0.0.1:8000`.

### 2. Web App Setup (Next.js Frontend & API)
Open a new terminal session, initialize the Next.js application, and setup the database.

```bash
cd apps/web

# Install Node dependencies
npm install

# Push database schema to SQLite
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

## Running the Application

### Development Environment
To run the full application in development mode, ensure both services are running simultaneously in separate terminal instances.

Terminal 1 (OCR Service):
```bash
cd apps/ocr-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 (Web App):
```bash
cd apps/web
npm run dev
```
The web interface will be accessible at `http://localhost:3000`.

### Database Management (Prisma Studio)
To inspect, query, and manage your local SQLite database records, utilize Prisma Studio.

```bash
cd apps/web
npx prisma studio
```
Prisma Studio will launch a local database GUI, accessible at `http://localhost:5555`.

### Production Deployment Guidelines

When deploying to a production environment, adhere to the following best practices:

1. **Database Strategy**: Replace SQLite with a robust relational database (e.g., PostgreSQL, MySQL) by modifying the `DATABASE_URL` and updating the database provider in `schema.prisma`.
2. **Build Web App**:
   ```bash
   cd apps/web
   npm run build
   npm start
   ```
3. **Containerization (OCR Service)**: Deploy the OCR service using the provided Dockerfile.
   ```bash
   cd apps/ocr-service
   docker build -t ocr-service .
   docker run -p 8000:8000 ocr-service
   ```
4. **Environment Variables**: Ensure all production secrets and API keys are securely injected via your hosting provider's environment management system.
5. **Security**: Ensure the OCR service endpoint (`OCR_SERVICE_URL`) is secured and not publicly exposed, routing requests only from the internal Next.js API layer.

## Privacy & Data Persistence
This system is strictly designed with PII (Personally Identifiable Information) compliance in mind. Uploaded ID card images (KTP/STNK) are kept in memory during processing and are immediately discarded. No images are written to the disk or stored in the database. Only the structured, extracted text data is logged in the database for history tracking purposes.
