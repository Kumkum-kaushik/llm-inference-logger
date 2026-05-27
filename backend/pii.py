import re

def redact_pii(text: str) -> str:
    # Redact emails
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[EMAIL REDACTED]', text)
    # Redact phone numbers
    text = re.sub(r'(\+?\d[\d\s\-().]{7,}\d)', '[PHONE REDACTED]', text)
    return text