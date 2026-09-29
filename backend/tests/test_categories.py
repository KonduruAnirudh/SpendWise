CATEGORIES = "/api/v1/categories"


def test_new_user_sees_system_categories(client, auth_headers_for):
    headers = auth_headers_for()
    body = client.get(CATEGORIES, headers=headers).json()

    assert len(body) == 11
    assert all(category["is_system"] for category in body)


def test_filter_by_type(client, auth_headers_for):
    headers = auth_headers_for()
    body = client.get(CATEGORIES, params={"type": "income"}, headers=headers).json()

    assert [c["name"] for c in body] == ["Other Income", "Salary"]


def test_create_custom_category(client, auth_headers_for):
    headers = auth_headers_for()
    response = client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=headers)

    assert response.status_code == 201
    assert response.json()["is_system"] is False


def test_custom_category_is_private(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=asha)

    rahul_names = [c["name"] for c in client.get(CATEGORIES, headers=rahul).json()]
    assert "Gym" not in rahul_names


def test_duplicate_of_system_name_is_rejected_case_insensitively(client, auth_headers_for):
    headers = auth_headers_for()
    response = client.post(CATEGORIES, json={"name": "food", "type": "expense"}, headers=headers)

    assert response.status_code == 409


def test_same_custom_name_allowed_for_different_users(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")

    assert client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=asha).status_code == 201
    assert client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=rahul).status_code == 201


def test_cannot_delete_system_category(client, auth_headers_for):
    headers = auth_headers_for()
    food_id = next(c["id"] for c in client.get(CATEGORIES, headers=headers).json() if c["name"] == "Food")

    assert client.delete(f"{CATEGORIES}/{food_id}", headers=headers).status_code == 403


def test_cannot_delete_another_users_custom_category(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    gym_id = client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=asha).json()["id"]

    assert client.delete(f"{CATEGORIES}/{gym_id}", headers=rahul).status_code == 404


def test_delete_own_custom_category(client, auth_headers_for):
    headers = auth_headers_for()
    gym_id = client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=headers).json()["id"]

    assert client.delete(f"{CATEGORIES}/{gym_id}", headers=headers).status_code == 204