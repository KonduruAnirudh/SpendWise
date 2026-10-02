ME = "/api/v1/users/me"
CHANGE_PASSWORD = "/api/v1/users/me/change-password"
LOGIN = "/api/v1/auth/login"


def test_update_name_and_username(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com", full_name="Asha")

    response = client.patch(ME, json={"full_name": "  Asha Rao ", "username": "@Asha_Rao"}, headers=headers)

    assert response.status_code == 200
    assert response.json()["full_name"] == "Asha Rao"
    assert response.json()["username"] == "asha_rao"
    assert client.get(ME, headers=headers).json()["username"] == "asha_rao"


def test_partial_update_leaves_other_fields(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com", full_name="Asha")

    response = client.patch(ME, json={"full_name": "Asha R"}, headers=headers)

    assert response.json()["username"] == "asha"
    assert response.json()["full_name"] == "Asha R"


def test_keeping_your_own_username_is_fine(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com")

    assert client.patch(ME, json={"username": "asha"}, headers=headers).status_code == 200


def test_taking_someone_elses_username_is_a_conflict(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com")
    auth_headers_for("rahul@example.com")

    response = client.patch(ME, json={"username": "rahul"}, headers=headers)

    assert response.status_code == 409
    assert response.json()["detail"] == "This username is taken"


def test_blank_name_and_bad_username_are_rejected(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com")

    assert client.patch(ME, json={"full_name": ""}, headers=headers).status_code == 422
    assert client.patch(ME, json={"username": "no spaces"}, headers=headers).status_code == 422


def test_email_and_currency_are_not_changed_by_patch(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com")

    response = client.patch(ME, json={"email": "new@example.com", "currency": "USD"}, headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "asha@example.com"
    assert response.json()["currency"] == "INR"


def test_change_password_then_sign_in_with_the_new_one(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com", password="supersecret1")

    response = client.post(
        CHANGE_PASSWORD, json={"current_password": "supersecret1", "new_password": "evenbetter22"}, headers=headers
    )

    assert response.status_code == 204
    old = client.post(LOGIN, data={"username": "asha@example.com", "password": "supersecret1"})
    new = client.post(LOGIN, data={"username": "asha@example.com", "password": "evenbetter22"})
    assert old.status_code == 401
    assert new.status_code == 200


def test_wrong_current_password_is_a_400_not_a_401(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com", password="supersecret1")

    response = client.post(
        CHANGE_PASSWORD, json={"current_password": "wrong-one", "new_password": "evenbetter22"}, headers=headers
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Your current password is incorrect"


def test_new_password_must_differ_and_meet_the_length_rule(client, auth_headers_for):
    headers = auth_headers_for("asha@example.com", password="supersecret1")

    same = client.post(
        CHANGE_PASSWORD, json={"current_password": "supersecret1", "new_password": "supersecret1"}, headers=headers
    )
    short = client.post(
        CHANGE_PASSWORD, json={"current_password": "supersecret1", "new_password": "short"}, headers=headers
    )

    assert same.status_code == 400
    assert short.status_code == 422


def test_profile_endpoints_require_sign_in(client):
    assert client.patch(ME, json={"full_name": "X"}).status_code == 401
    assert client.post(CHANGE_PASSWORD, json={"current_password": "a", "new_password": "abcdefgh"}).status_code == 401
