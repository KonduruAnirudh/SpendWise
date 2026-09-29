from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ChatRole


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str
    tools_used: list[str]


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: ChatRole
    content: str
    tools_used: list[str]
    created_at: datetime