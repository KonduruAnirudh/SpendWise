import re

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.user import User
from app.repositories import user_repository


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
