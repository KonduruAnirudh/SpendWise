from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.ai.prompts import build_system_prompt
from app.ai.providers import LLMMessage, LLMProvider, LLMProviderError
from app.ai.tools import execute_tool, tool_specs
from app.core.exceptions import NotFoundError, ServiceUnavailableError
from app.models.conversation import ChatMessage, Conversation
from app.models.enums import ChatRole
from app.models.user import User
from app.repositories import conversation_repository
from app.schemas.ai import ChatRequest, ChatResponse

MAX_TOOL_ROUNDS = 5
HISTORY_WINDOW = 10
FALLBACK_REPLY = "Sorry, I couldn't work that out. Could you rephrase the question?"
UNAVAILABLE = "The AI assistant is unavailable right now. Please try again in a moment."


def get_conversation(db: Session, user: User, conversation_id: int) -> Conversation:
    conversation = conversation_repository.get_for_user(db, conversation_id, user.id)
    if conversation is None:
        raise NotFoundError("Conversation not found")
    return conversation


def list_conversations(db: Session, user: User) -> list[Conversation]:
    return conversation_repository.list_for_user(db, user.id)


def list_messages(db: Session, user: User, conversation_id: int) -> list[ChatMessage]:
    conversation = get_conversation(db, user, conversation_id)
    return conversation_repository.list_messages(db, conversation.id)


def delete_conversation(db: Session, user: User, conversation_id: int) -> None:
    conversation_repository.delete(db, get_conversation(db, user, conversation_id))
    db.commit()


def chat(db: Session, user: User, provider: LLMProvider, request: ChatRequest) -> ChatResponse:
    conversation, history = _conversation_and_history(db, user, request)

    messages = [LLMMessage(role="system", content=build_system_prompt(user, date.today()))]
    messages += [LLMMessage(role=m.role.value, content=m.content) for m in history]
    messages.append(LLMMessage(role="user", content=request.message))

    reply, tools_used = _run_tool_loop(db, user, provider, messages)

    conversation.updated_at = datetime.now(timezone.utc)
    conversation_repository.add(
        db, ChatMessage(conversation_id=conversation.id, role=ChatRole.USER, content=request.message, tools_used=[])
    )
    conversation_repository.add(
        db, ChatMessage(conversation_id=conversation.id, role=ChatRole.ASSISTANT, content=reply, tools_used=tools_used)
    )
    db.commit()
    return ChatResponse(conversation_id=conversation.id, reply=reply, tools_used=tools_used)


def _conversation_and_history(
    db: Session, user: User, request: ChatRequest
) -> tuple[Conversation, list[ChatMessage]]:
    if request.conversation_id is not None:
        conversation = get_conversation(db, user, request.conversation_id)
        return conversation, conversation_repository.recent_messages(db, conversation.id, HISTORY_WINDOW)

    conversation = Conversation(user_id=user.id, title=request.message[:60])
    conversation_repository.add(db, conversation)
    db.flush()
    return conversation, []


def _run_tool_loop(
    db: Session, user: User, provider: LLMProvider, messages: list[LLMMessage]
) -> tuple[str, list[str]]:
    specs = tool_specs()
    tools_used: list[str] = []

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = provider.chat(messages, specs)
        except LLMProviderError as exc:
            db.rollback()
            raise ServiceUnavailableError(UNAVAILABLE) from exc

        if not response.tool_calls:
            return response.content or FALLBACK_REPLY, tools_used

        messages.append(LLMMessage(role="assistant", content=response.content, tool_calls=response.tool_calls))
        for call in response.tool_calls:
            tools_used.append(call.name)
            messages.append(LLMMessage(role="tool", content=execute_tool(db, user, call), tool_call_id=call.id))

    return FALLBACK_REPLY, tools_used