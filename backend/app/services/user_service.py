import re

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories import user_repository
from app.schemas.user import PasswordChange, UserUpdate

TAKEN_USERNAME = "This username is taken"


def suggest_username(db: Session, email: str) -> str:
    """A free handle derived from the email: asha.k@x.com → ashak, then ashak2, ashak3, ..."""
    base = re.sub(r"[^a-z0-9_]", "", email.split("@")[0].lower())
    if not base[:1].isalpha():
        base = f"user{base}"
    base = base[:26]
    if len(base) < 3:
        base = f"{base}_user"
    candidate, n = base, 1
    while user_repository.username_exists(db, candidate):
        n += 1
        candidate = f"{base}{n}"
    return candidate


def lookup(db: Session, username: str) -> User:
    user = user_repository.get_by_username(db, username)
    if user is None:
        raise NotFoundError(f"No SpendWise user with the username @{username}")
    return user


def update_profile(db: Session, user: User, data: UserUpdate) -> User:
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.username is not None and data.username != user.username:
        if user_repository.username_exists(db, data.username):
            raise ConflictError(TAKEN_USERNAME)
        user.username = data.username
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(TAKEN_USERNAME)
    db.refresh(user)
    return user


def change_password(db: Session, user: User, data: PasswordChange) -> None:
    # 400, not 401: the user is signed in; only the password they typed is wrong.
    if not verify_password(data.current_password, user.password_hash):
        raise BadRequestError("Your current password is incorrect")
    if data.new_password == data.current_password:
        raise BadRequestError("Choose a new password that's different from your current one")
    user.password_hash = hash_password(data.new_password)
    db.commit()
