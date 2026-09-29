from collections.abc import Generator
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.repositories import user_repository


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    subject = decode_access_token(token)
    if subject is None or not subject.isdigit():
        raise UnauthorizedError("Could not validate credentials")

    user = user_repository.get_by_id(db, int(subject))
    if user is None:
        raise UnauthorizedError("Could not validate credentials")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]