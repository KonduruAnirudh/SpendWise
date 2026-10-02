from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    DUMMY_HASH,
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories import user_repository
from app.schemas.user import UserCreate
from app.services.user_service import TAKEN_USERNAME, suggest_username

DUPLICATE_EMAIL = "An account with this email already exists"
BAD_CREDENTIALS = "Incorrect email or password"


def register_user(db: Session, data: UserCreate) -> User:
    email = data.email.lower()
    if user_repository.get_by_email(db, email) is not None:
        raise ConflictError(DUPLICATE_EMAIL)
    if data.username is not None and user_repository.username_exists(db, data.username):
        raise ConflictError(TAKEN_USERNAME)

    user = User(
        email=email,
        username=data.username or suggest_username(db, email),
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        currency=data.currency,
    )
    user_repository.add(db, user)
    try:
        db.commit()
    except IntegrityError:
        # Two sign-ups racing for the same email or username: the unique indexes decide.
        db.rollback()
        raise ConflictError("That email or username was just taken; try again")
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = user_repository.get_by_email(db, email.lower())
    if user is None:
        verify_password(password, DUMMY_HASH)
        raise UnauthorizedError(BAD_CREDENTIALS)
    if not verify_password(password, user.password_hash):
        raise UnauthorizedError(BAD_CREDENTIALS)
    return user


def login(db: Session, email: str, password: str) -> str:
    user = authenticate_user(db, email, password)
    return create_access_token(subject=str(user.id))