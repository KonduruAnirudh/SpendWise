from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import ChatMessage, Conversation


def list_for_user(db: Session, user_id: int) -> list[Conversation]:
    stmt = select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc())
    return list(db.scalars(stmt))


def get_for_user(db: Session, conversation_id: int, user_id: int) -> Conversation | None:
    stmt = select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    return db.scalar(stmt)


def recent_messages(db: Session, conversation_id: int, limit: int) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
    )
    return list(reversed(list(db.scalars(stmt))))


def list_messages(db: Session, conversation_id: int) -> list[ChatMessage]:
    stmt = select(ChatMessage).where(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.id)
    return list(db.scalars(stmt))


def add(db: Session, obj: Conversation | ChatMessage) -> None:
    db.add(obj)


def delete(db: Session, obj: Conversation) -> None:
    db.delete(obj)