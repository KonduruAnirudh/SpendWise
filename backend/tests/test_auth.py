from sqlalchemy import select

from app.models.user import User

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/users/me"

VALID_USER = {"email": "Asha@Example.com", "password": "supersecret1", "full_name": "Asha Rao"}


def test_register_returns_user_without_password(client):
    response = client.post(REGISTER, json=VALID_USER)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "asha@example.com"
    assert body["currency"] == "INR"
    assert "password" not in body
    assert "password_hash" not in body


def test_password_is_stored_hashed(client, db):
    client.post(REGISTER, json=VALID_USER)

    user = db.scalar(select(User).where(User.email == "asha@example.com"))
    assert user.password_hash != VALID_USER["password"]
    assert user.password_hash.startswith("$argon2")


def test_register_duplicate_email_returns_409(client):
    client.post(REGISTER, json=VALID_USER)
    response = client.post(REGISTER, json={**VALID_USER, "email": "asha@example.com"})

    assert response.status_code == 409


def test_register_short_password_returns_422(client):
    response = client.post(REGISTER, json={**VALID_USER, "password": "short"})

    assert response.status_code == 422


def test_login_returns_bearer_token(client):
    client.post(REGISTER, json=VALID_USER)
    response = client.post(LOGIN, data={"username": "asha@example.com", "password": "supersecret1"})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client):
    client.post(REGISTER, json=VALID_USER)
    response = client.post(LOGIN, data={"username": "asha@example.com", "password": "wrong-password"})

    assert response.status_code == 401


def test_me_without_token_returns_401(client):
    assert client.get(ME).status_code == 401


def test_me_with_invalid_token_returns_401(client):
    response = client.get(ME, headers={"Authorization": "Bearer not.a.real.token"})

    assert response.status_code == 401


def test_me_with_valid_token_returns_profile(client, auth_headers_for):
    headers = auth_headers_for()
    response = client.get(ME, headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "asha@example.com"