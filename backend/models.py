from pydantic import BaseModel
from typing import List

class MessageInput(BaseModel):
    session_id: str
    message: str

class NewConversationInput(BaseModel):
    session_id: str

class ConversationResponse(BaseModel):
    session_id: str
    created_at: str

class MessageResponse(BaseModel):
    role: str
    content: str
    created_at: str
