from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.ai import chat_service
from app.ai.providers import LLMProvider, get_llm_provider
from app.core.dependencies import CurrentUser, DbSession
from app.models.conversation import ChatMessage, Conversation
from app.schemas.ai import ChatMessageResponse, ChatRequest, ChatResponse, ConversationSummary

router = APIRouter(prefix="/ai", tags=["ai assistant"])

Provider = Annotated[LLMProvider, Depends(get_llm_provider)]


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, current_user: CurrentUser, db: DbSession, provider: Provider) -> ChatResponse:
    return chat_service.chat(db, current_user, provider, request)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(current_user: CurrentUser, db: DbSession) -> list[Conversation]:
    return chat_service.list_conversations(db, current_user)


@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessageResponse])
def list_messages(conversation_id: int, current_user: CurrentUser, db: DbSession) -> list[ChatMessage]:
    return chat_service.list_messages(db, current_user, conversation_id)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: int, current_user: CurrentUser, db: DbSession) -> None:
    chat_service.delete_conversation(db, current_user, conversation_id)