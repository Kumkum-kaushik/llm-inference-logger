import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from models import MessageInput
from database import get_connection, init_db
from sdk import chat_with_logging, generate_session_id

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.post("/conversation/new")
def new_conversation():
    session_id = generate_session_id()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO conversations (session_id) VALUES (%s)", (session_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"session_id": session_id}

@app.get("/conversations")
def list_conversations():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT session_id, created_at FROM conversations ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"session_id": r[0], "created_at": str(r[1])} for r in rows]

@app.post("/chat")
def chat(input: MessageInput):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT session_id FROM conversations WHERE session_id = %s", (input.session_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Conversation not found")
    cur.execute("SELECT role, content FROM messages WHERE session_id = %s ORDER BY created_at", (input.session_id,))
    history = [{"role": r[0], "content": r[1]} for r in cur.fetchall()]
    history.append({"role": "user", "content": input.message})
    cur.execute("INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (input.session_id, "user", input.message))
    conn.commit()
    response = chat_with_logging(input.session_id, history, provider=input.provider)
    cur.execute("INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (input.session_id, "assistant", response))
    conn.commit()
    cur.close()
    conn.close()
    return {"response": response, "session_id": input.session_id}

@app.get("/conversation/{session_id}/messages")
def get_messages(session_id: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT role, content, created_at FROM messages WHERE session_id = %s ORDER BY created_at", (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"role": r[0], "content": r[1], "created_at": str(r[2])} for r in rows]

@app.delete("/conversation/{session_id}")
def cancel_conversation(session_id: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM messages WHERE session_id = %s", (session_id,))
    cur.execute("DELETE FROM conversations WHERE session_id = %s", (session_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Conversation deleted"}

@app.get("/logs")
def get_logs():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM inference_logs ORDER BY created_at DESC LIMIT 50")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.get("/stats")
def get_stats():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            AVG(latency_ms) as avg_latency,
            SUM(input_tokens + output_tokens) as total_tokens,
            COUNT(*) FILTER (WHERE status = 'error') as error_count,
            COUNT(*) as total_requests
        FROM inference_logs
    """)
    row = cur.fetchone()
    cur.close()
    conn.close()
    return {
        "avg_latency_ms": round(row[0] or 0, 2),
        "total_tokens": row[1] or 0,
        "error_count": row[2] or 0,
        "total_requests": row[3] or 0
    }

@app.post("/chat/stream")
def chat_stream(input: MessageInput):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT session_id FROM conversations WHERE session_id = %s", (input.session_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Conversation not found")
    cur.execute("SELECT role, content FROM messages WHERE session_id = %s ORDER BY created_at", (input.session_id,))
    history = [{"role": r[0], "content": r[1]} for r in cur.fetchall()]
    history.append({"role": "user", "content": input.message})
    cur.execute("INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (input.session_id, "user", input.message))
    conn.commit()
    cur.close()
    conn.close()

    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def generate():
        full_response = ""
        stream = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=history,
            stream=True
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            full_response += token
            yield token

        conn2 = get_connection()
        cur2 = conn2.cursor()
        cur2.execute("INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                     (input.session_id, "assistant", full_response))
        conn2.commit()
        cur2.close()
        conn2.close()

    return StreamingResponse(generate(), media_type="text/plain")
