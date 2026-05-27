# LLM Inference Logging System

A full-stack chatbot app built with FastAPI, React, PostgreSQL, and Groq (LLaMA 3). Every LLM call gets logged — latency, tokens, model, status — so you can actually see what's happening under the hood.



## What this does

- Chat with an LLM across multiple turns
- Every inference call is logged — latency, token usage, model, provider, status
- PII (emails, phone numbers) is automatically redacted before storing logs
- Live dashboard showing avg latency, total tokens, total requests, and errors
- Switch between two Groq models mid-conversation
- Streaming responses — text appears word by word as the model generates it
- One-command Docker setup — no manual installs needed



## Quick Start (Docker)

1. Make sure Docker Desktop is running
2. Create a .env file in the root folder with: GROQ_API_KEY=your_groq_api_key_here
3. Run: docker compose up --build

Frontend at http://localhost:5173 and API docs at http://localhost:8000/docs



## Manual Setup

Prerequisites: Python 3.10+, Node.js 18+, PostgreSQL 17, Groq API key from console.groq.com

Backend setup:
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

Create a .env file in backend folder: GROQ_API_KEY=your_groq_api_key_here

Create the database in psql: CREATE DATABASE ollive_db;

Start the server: uvicorn main:app --reload

Frontend setup:
cd frontend
npm install
npm run dev



## How it works

User chats in the React UI, which calls the FastAPI backend. The backend passes the message to the SDK layer, which calls the Groq LLM, measures latency, captures token counts, redacts any PII, and writes a log to PostgreSQL — all before returning the response to the user.

Tables: conversations, messages, inference_logs



## API Endpoints

POST   /conversation/new              Start a new conversation
GET    /conversations                 List all conversations
POST   /chat                          Send a message, get a response
POST   /chat/stream                   Same but streams tokens in real time
GET    /conversation/{id}/messages    Get message history
DELETE /conversation/{id}             Delete a conversation
GET    /logs                          View recent inference logs
GET    /stats                         Avg latency, total tokens, error count



## Bonus Features

Docker Compose — one command starts backend, frontend, and PostgreSQL together. Backend waits for DB to be healthy before starting.

PII Redaction — pii.py uses regex to replace emails and phone numbers with [EMAIL REDACTED] and [PHONE REDACTED] before storing in the database.

Dashboard — Stats tab shows metric cards and a bar chart for latency, tokens, requests, and errors using Recharts.

Multi-provider — dropdown to pick between Groq Fast (llama-3.1-8b-instant) and Groq Large (llama-3.3-70b-versatile).

Streaming — /chat/stream uses FastAPI StreamingResponse. Frontend reads it with fetch() and ReadableStream, updating the message token by token.



## Tradeoffs

Synchronous logging — writing to DB in the same request cycle keeps things simple. For higher traffic this should move to an async queue.

No connection pooling — each DB call opens and closes a connection. Production would use psycopg2.pool or SQLAlchemy.

In-process SDK — lives in the same FastAPI process. Easy to reason about but harder to scale independently.

100-char preview — enough to debug without bloating storage. Full content is always in the messages table.



## Tech Stack

Backend — FastAPI (Python)
Database — PostgreSQL
LLM — Groq (LLaMA 3.1 8B / LLaMA 3.3 70B)
Frontend — React + Vite + Recharts


## What I'd Improve With More Time

Async logging — move DB writes to a background queue (Redis + worker) so they don't add latency to the chat response.

Connection pooling — use psycopg2.pool or SQLAlchemy so the app isn't opening and closing a new DB connection on every request.

Pagination — /logs and /conversations currently return everything. For large datasets these need limit/offset pagination.

Better error handling — retry logic in the SDK for transient Groq API failures, and proper error messages shown in the UI.

Auth — right now anyone can see all conversations. Adding user accounts would scope conversations per user.

More providers — extend multi-provider support to OpenAI and Anthropic once API keys are available.
HTTP Client — Axios
Containerization — Docker + Docker Compose
