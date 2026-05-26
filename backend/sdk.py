import os
import time
import uuid
from groq import Groq
from dotenv import load_dotenv
from database import get_connection

load_dotenv()
client= Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_session_id():
    return str(uuid.uuid4())

def chat_with_logging(session_id, messages):
    start_time = time.time()
    status= "success",
    response_text = "",
    input_tokens= 0,
    output_tokens= 0,

    try:
        response = client.chat.completions.create(
            model ="llama-3.1-8b-instant",
            messages=messages,
        )
        response_text = response.choices[0].message.content
        input_tokens = response.usage.prompt_tokens
        output_tokens = response.usage.completion_tokens
    
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
                session_id,
                "llama-3.1-8b-instant",
                "groq",
                latency_ms,
                input_tokens,
                output_tokens,
                status,
                messages[-1]["content"][:100],
                response_text[:100]
            ))
    conn.commit()
    cur.close()
    conn.close()

    return response_text