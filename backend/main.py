from fastapi import FastAPI, HTTPException
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

    # Check session exists
    cur.execute("SELECT session_id FROM conversations WHERE session_id = %s", (input.session_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get conversation history
    cur.execute("SELECT role, content FROM messages WHERE session_id = %s ORDER BY created_at", (input.session_id,))
    history = [{"role": r[0], "content": r[1]} for r in cur.fetchall()]

    # Add new message
    history.append({"role": "user", "content": input.message})

    # Save user message
    cur.execute("INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (input.session_id, "user", input.message))
    conn.commit()

    # Get response
    response = chat_with_logging(input.session_id, history)

    # Save assistant message
    cur.execute("INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
                (input.session_id, "user", response))
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