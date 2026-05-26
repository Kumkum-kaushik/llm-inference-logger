# Ollive Assignment — LLM Inference Logging System

A full-stack chatbot application with inference logging, built with FastAPI, React, PostgreSQL, and Groq (LLaMA 3).

---

## What this does

A lightweight system that:
- Lets users chat with an LLM (multi-turn conversations)
- Logs every inference call — latency, token usage, model, status, timestamps
- Stores all chat messages and metadata in PostgreSQL
- Exposes a clean REST API for ingestion and retrieval
- Provides a simple React UI to create, resume, and delete conversations

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 17
- Groq API key (free at console.groq.com)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
```

Create a `.env` file in the backend folder:
```
GROQ_API_KEY=your_groq_api_key_here
```

Create the database:
```bash
psql -U postgres -h 127.0.0.1
CREATE DATABASE ollive_db;
\q
```

Start the backend:
```bash
uvicorn main:app --reload
```

API docs available at: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Architecture Overview

```
User (React UI)
      ↓
FastAPI Backend
      ↓
  SDK Layer (sdk.py)
  - Calls Groq LLM
  - Measures latency
  - Captures token usage
  - Logs to DB in real time
      ↓
PostgreSQL Database
  - conversations
  - messages  
  - inference_logs
```

The SDK layer wraps every LLM call — before the call it records the start time, after the call it captures token counts and status, then immediately writes the log to the database. This happens synchronously so no logs are lost.

---

## Schema Design

### conversations
```sql
id          SERIAL PRIMARY KEY
session_id  VARCHAR(100) UNIQUE NOT NULL
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### messages
```sql
id          SERIAL PRIMARY KEY
session_id  VARCHAR(100) NOT NULL
role        VARCHAR(20) NOT NULL   -- 'user' or 'assistant'
content     TEXT NOT NULL
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### inference_logs
```sql
id             SERIAL PRIMARY KEY
session_id     VARCHAR(100) NOT NULL
model          VARCHAR(100)         -- e.g. llama-3.1-8b-instant
provider       VARCHAR(50)          -- e.g. groq
latency_ms     FLOAT                -- end-to-end response time
input_tokens   INTEGER
output_tokens  INTEGER
status         VARCHAR(20)          -- success or error
input_preview  TEXT                 -- first 100 chars of input
output_preview TEXT                 -- first 100 chars of output
created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Why this schema?**
- `conversations` and `messages` are separate — easy to list all chats without loading message history
- `inference_logs` is separate from `messages` — observability data shouldn't be mixed with chat data
- `input_preview` and `output_preview` store only 100 chars — enough for debugging without bloating storage
- `session_id` as VARCHAR (UUID) rather than FK integer — keeps ingestion simple and stateless

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversation/new` | Start a new conversation |
| GET | `/conversations` | List all conversations |
| POST | `/chat` | Send a message, get a response |
| GET | `/conversation/{id}/messages` | Get message history |
| DELETE | `/conversation/{id}` | Cancel/delete a conversation |
| GET | `/logs` | View inference logs |

---

## Tradeoffs Made

**Synchronous logging** — logs are written to DB in the same request cycle. Simpler and guarantees no lost logs, but adds a small DB write latency to every chat response. For production, this would move to async or a queue.

**In-process SDK** — the SDK lives in the same FastAPI process rather than as a separate service. Faster to build, easier to debug, but harder to scale independently.

**No connection pooling** — each DB operation opens and closes a connection. Fine for low traffic, but for production would use psycopg2.pool or SQLAlchemy with pooling.

**Preview truncation at 100 chars** — keeps logs lightweight. Full content is already in the messages table, so nothing is lost.

**PostgreSQL over SQLite** — chose PostgreSQL for proper concurrent access, better query performance on logs, and production readiness.

---

## What I'd Improve With More Time

- Async logging via a queue (Redis + worker) to remove DB write from the critical path
- Connection pooling for the database
- Streaming responses from the LLM
- Dashboard UI for latency and token usage trends
- Docker Compose for one-command setup
- PII redaction before storing message previews
- Pagination on the /logs and /conversations endpoints
- Better error handling and retry logic in the SDK

---

## Tech Stack

- **Backend** — FastAPI (Python)
- **Database** — PostgreSQL
- **LLM** — Groq (LLaMA 3.1 8B)
- **Frontend** — React + Vite
- **HTTP Client** — Axios