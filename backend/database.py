import psycopg2
def get_connection():
    conn = psycopg2.connect(
        host="127.0.0.1",
        database="ollive_db",
        user="postgres",
        password=""
    )
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(100) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(100) NOT NULL,
            role VARCHAR(10) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inference_logs (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(100) NOT NULL,
            model VARCHAR(100),
            provider VARCHAR(100),
            latency_ms FLOAT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            status VARCHAR(20),
            input_preview TEXT,
            output_preview TEXT,  
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()