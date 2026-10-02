REGISTER = "/api/v1/auth/register"
GROUPS = "/api/v1/groups"
LOOKUP = "/api/v1/users/lookup"


def register(client, email, username=None, full_name="Asha"):
    payload = {"email": email, "password": "supersecret1", "full_name": full_name}
    if username is not None:
        payload["username"] = username
    return client.post(REGISTER, json=payload)


def test_register_with_username_normalizes_it(client):
    response = register(client, "asha@example.com", username=" @Asha_K ")

    assert response.status_code == 201
    assert response.json()["username"] == "asha_k"


def test_register_without_username_generates_one_from_the_email(client):
    first = register(client, "asha.k@example.com").json()
    second = register(client, "asha.k@other.com").json()

    assert first["username"] == "ashak"
    assert second["username"] == "ashak2"


def test_duplicate_username_is_a_conflict(client):
    register(client, "asha@example.com", username="asha")
    response = register(client, "other@example.com", username="ASHA")

    assert response.status_code == 409
    assert response.json()["detail"] == "This username is taken"


def test_invalid_username_is_rejected(client):
    for index, bad in enumerate(["ab", "1asha", "asha-k", "a" * 31]):
        response = register(client, f"user{index}@example.com", username=bad)
        assert response.status_code == 422, bad


def test_me_includes_username(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com")

    assert client.get("/api/v1/users/me", headers=headers).json()["username"] == "asha"


def test_lookup_is_exact_and_returns_only_public_fields(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    register(client, "rahul@example.com", username="rahul_m", full_name="Rahul Mehta")

    found = client.get(LOOKUP, params={"username": "@Rahul_M"}, headers=asha)
    partial = client.get(LOOKUP, params={"username": "rahul"}, headers=asha)

    assert found.status_code == 200
    assert found.json() == {"username": "rahul_m", "full_name": "Rahul Mehta"}
    assert partial.status_code == 404


def test_lookup_requires_sign_in(client):
    assert client.get(LOOKUP, params={"username": "asha"}).status_code == 401


def test_member_added_by_username_sees_the_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()

    added = client.post(f"{GROUPS}/{group['id']}/members", json={"username": "rahul"}, headers=asha)

    assert added.status_code == 201
    assert added.json()["display_name"] == "Rahul"
    assert added.json()["username"] == "rahul"
    assert added.json()["is_guest"] is False
    assert [g["name"] for g in client.get(GROUPS, headers=rahul).json()] == ["Goa Trip"]


def test_unknown_username_is_not_found(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    group = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()

    response = client.post(f"{GROUPS}/{group['id']}/members", json={"username": "nobody"}, headers=asha)

    assert response.status_code == 404
    assert response.json()["detail"] == "No SpendWise user with the username @nobody"


def test_same_name_members_are_told_apart_by_handle(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    register(client, "rahul.one@example.com", username="rahul1", full_name="Rahul")
    register(client, "rahul.two@example.com", username="rahul2", full_name="Rahul")
    group = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()

    first = client.post(f"{GROUPS}/{group['id']}/members", json={"username": "rahul1"}, headers=asha).json()
    second = client.post(f"{GROUPS}/{group['id']}/members", json={"username": "rahul2"}, headers=asha).json()

    assert first["display_name"] == "Rahul"
    assert second["display_name"] == "Rahul (@rahul2)"


def test_guest_members_have_no_username(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    group = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()

    guest = client.post(f"{GROUPS}/{group['id']}/members", json={"display_name": "Karthik"}, headers=asha).json()

    assert guest["username"] is None
    assert guest["is_guest"] is True


def test_username_and_email_together_are_rejected(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    group = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()

    response = client.post(
        f"{GROUPS}/{group['id']}/members", json={"username": "asha", "email": "asha@example.com"}, headers=asha
    )

    assert response.status_code == 422
