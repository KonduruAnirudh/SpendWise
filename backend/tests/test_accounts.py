ACCOUNTS = "/api/v1/accounts"

HDFC = {"name": "HDFC", "type": "bank", "opening_balance": "1500.00"}


def test_create_account_defaults_currency_to_user_currency(client, auth_headers_for):
    headers = auth_headers_for()
    response = client.post(ACCOUNTS, json=HDFC, headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["currency"] == "INR"
    assert body["opening_balance"] == "1500.00"
    assert "user_id" not in body


def test_list_returns_only_my_accounts(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    client.post(ACCOUNTS, json=HDFC, headers=asha)
    client.post(ACCOUNTS, json={"name": "SBI", "type": "savings"}, headers=rahul)

    names = [a["name"] for a in client.get(ACCOUNTS, headers=asha).json()]
    assert names == ["HDFC"]


def test_cannot_read_update_or_delete_another_users_account(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    account_id = client.post(ACCOUNTS, json=HDFC, headers=asha).json()["id"]

    assert client.get(f"{ACCOUNTS}/{account_id}", headers=rahul).status_code == 404
    assert client.patch(f"{ACCOUNTS}/{account_id}", json={"name": "Mine now"}, headers=rahul).status_code == 404
    assert client.delete(f"{ACCOUNTS}/{account_id}", headers=rahul).status_code == 404
    assert client.get(f"{ACCOUNTS}/{account_id}", headers=asha).json()["name"] == "HDFC"


def test_duplicate_account_name_returns_409(client, auth_headers_for):
    headers = auth_headers_for()
    client.post(ACCOUNTS, json=HDFC, headers=headers)

    assert client.post(ACCOUNTS, json=HDFC, headers=headers).status_code == 409


def test_same_name_allowed_for_different_users(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")

    assert client.post(ACCOUNTS, json=HDFC, headers=asha).status_code == 201
    assert client.post(ACCOUNTS, json=HDFC, headers=rahul).status_code == 201


def test_invalid_account_type_returns_422(client, auth_headers_for):
    headers = auth_headers_for()
    response = client.post(ACCOUNTS, json={"name": "X", "type": "crypto"}, headers=headers)

    assert response.status_code == 422


def test_patch_updates_only_sent_fields(client, auth_headers_for):
    headers = auth_headers_for()
    account_id = client.post(ACCOUNTS, json=HDFC, headers=headers).json()["id"]

    response = client.patch(f"{ACCOUNTS}/{account_id}", json={"name": "HDFC Salary"}, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "HDFC Salary"
    assert body["type"] == "bank"
    assert body["opening_balance"] == "1500.00"


def test_delete_then_get_returns_404(client, auth_headers_for):
    headers = auth_headers_for()
    account_id = client.post(ACCOUNTS, json=HDFC, headers=headers).json()["id"]

    assert client.delete(f"{ACCOUNTS}/{account_id}", headers=headers).status_code == 204
    assert client.get(f"{ACCOUNTS}/{account_id}", headers=headers).status_code == 404


def test_accounts_require_authentication(client):
    assert client.get(ACCOUNTS).status_code == 401