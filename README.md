# LLM Inference Logging System

A full-stack chatbot application built with FastAPI, React, PostgreSQL, and Groq using LLaMA 3 models.

The goal of this project is not only to build an LLM-powered chatbot, but also to understand what happens internally during every inference call. Each request is logged with useful metadata such as latency, token usage, selected model, provider details, and request status.

The system also includes PII redaction, streaming responses, model switching, and a live analytics dashboard for monitoring inference behavior in real time.

---

# Features

- Multi-turn chatbot conversations
- Inference logging for every LLM request
- Tracks latency, token usage, model, provider, and request status
- Automatic PII redaction before storing logs
- Live analytics dashboard with charts and metrics
- Streaming responses with token-by-token rendering
- Switch between multiple Groq LLaMA models during chat
- Docker support for one-command setup

---

# Quick Start (Docker)

### Prerequisites

- Docker Desktop installed and running
- Groq API key from https://console.groq.com

### Setup

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Run the project:

```bash
docker compose up --build
```

### Services

Frontend:
```txt
http://localhost:5173
```

FastAPI Docs:
```txt
http://localhost:8000/docs
```

---

# Manual Setup

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 17
- Groq API Key

---

# Backend Setup

```bash
cd backend

python -m venv venv
```

Activate virtual environment:

### Windows
```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend folder:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Create the PostgreSQL database:

```sql
CREATE DATABASE ollive_db;
```

Start the backend server:

```bash
uvicorn main:app --reload
```

---

# Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# Project Workflow

The user interacts with the chatbot through the React frontend.

The frontend sends requests to the FastAPI backend, which forwards them to the SDK layer responsible for handling Groq LLM inference.

Before returning the response to the user, the backend:

- Measures latency
- Tracks token usage
- Redacts sensitive information
- Stores logs in PostgreSQL

The system maintains three main tables:

- `conversations`
- `messages`
- `inference_logs`

---

# API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversation/new` | Create a new conversation |
| GET | `/conversations` | Get all conversations |
| POST | `/chat` | Send a message and receive response |
| POST | `/chat/stream` | Stream response token by token |
| GET | `/conversation/{id}/messages` | Get conversation history |
| DELETE | `/conversation/{id}` | Delete a conversation |
| GET | `/logs` | Fetch inference logs |
| GET | `/stats` | Fetch latency and token statistics |

---

# Bonus Features

## Streaming Responses

The `/chat/stream` endpoint uses FastAPI `StreamingResponse`.

On the frontend, responses are handled using `fetch()` and `ReadableStream`, allowing tokens to appear gradually in real time.

---

## PII Redaction

The `pii.py` module uses regex patterns to detect and redact:

- Email addresses
- Phone numbers

Sensitive data is replaced before logs are stored in the database.

Example:

```txt
john@gmail.com → [EMAIL REDACTED]
```

---

## Live Dashboard

The dashboard displays:

- Average latency
- Total tokens
- Request count
- Error count

Charts are built using Recharts.

---

## Multi-Model Support

Users can switch between:

- `llama-3.1-8b-instant`
- `llama-3.3-70b-versatile`

during an active conversation.

---

# Design Tradeoffs

## Synchronous Logging

Inference logs are written during the request cycle. This keeps the implementation simple but adds some latency.

For production-scale traffic, logging should move to a background worker or queue.

---

## No Connection Pooling

The current implementation opens and closes database connections per request.

A production setup would use:

- `psycopg2.pool`
- SQLAlchemy connection pooling

---

## In-Process SDK

The SDK layer currently runs inside the FastAPI application process.

This simplifies development but makes independent scaling harder.

---

## Limited Log Preview

Only a short preview of content is stored in inference logs to reduce storage usage, while full conversations remain available in the `messages` table.

---

# What I'd Improve With More Time

## Async Logging

Move logging to a background queue using Redis and workers so database writes do not impact chat latency.

---

## Connection Pooling

Use SQLAlchemy or psycopg2 pooling for better database performance under load.

---

## Pagination

Currently `/logs` and `/conversations` return all records.

Pagination with limit/offset should be added for scalability.

---

## Better Error Handling

Improve retry handling for transient Groq API failures and display cleaner error messages in the frontend UI.

---

## Authentication

Currently all conversations are public within the app.

Adding authentication would allow conversation isolation per user.

---

## Multi-Provider Support

Extend provider support beyond Groq to include:

- OpenAI
- Anthropic

---

# Tech Stack

## Backend
- FastAPI
- Python

## Frontend
- React
- Vite
- Recharts

## Database
- PostgreSQL

## LLM Provider
- Groq
- LLaMA 3.1 8B Instant
- LLaMA 3.3 70B Versatile

## HTTP Client
- Axios

## Containerization
- Docker
- Docker Compose

---

# What I have to improve with more time

This project can be extended into a production-grade observability platform for LLM applications by adding:

- Authentication and user management
- Distributed logging
- Request tracing
- Multiple LLM providers
- Rate limiting
- Cost monitoring
- Real-time analytics
- Async processing pipelines

---
