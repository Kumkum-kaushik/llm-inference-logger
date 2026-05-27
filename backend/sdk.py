import os
import time
import uuid
from groq import Groq
from dotenv import load_dotenv
from database import get_connection
from pii import redact_pii

load_dotenv()

def generate_session_id():
    return str(uuid.uuid4())

def chat_with_logging(session_id, messages, provider="groq-fast"):
    start_time = time.time()
    status = "success"
    response_text = ""
    input_tokens = 0
    output_tokens = 0

    if provider == "groq-fast":
        model_name = "llama-3.1-8b-instant"
    elif provider == "groq-large":
        model_name = "llama-3.3-70b-versatile"
    else:
        model_name = "llama-3.1-8b-instant"

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        res = client.chat.completions.create(model=model_name, messages=messages)
        response_text = res.choices[0].message.content
        input_tokens = res.usage.prompt_tokens
        output_tokens = res.usage.completion_tokens

    except Exception as e:
        status = "error"
        response_text = str(e)

    latency_ms = (time.time() - start_time) * 1000

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO inference_logs
        (session_id, model, provider, latency_ms, input_tokens, output_tokens, status, input_preview, output_preview)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        session_id, model_name, provider, latency_ms,
        input_tokens, output_tokens, status,
        redact_pii(messages[-1]["content"][:100]),
        redact_pii(response_text[:100])
    ))
    conn.commit()
    cur.close()
    conn.close()
    return response_text