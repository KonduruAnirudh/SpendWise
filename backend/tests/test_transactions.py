ACCOUNTS = "/api/v1/accounts"
CATEGORIES = "/api/v1/categories"
TRANSACTIONS = "/api/v1/transactions"


def create_account(client, headers, name="HDFC", opening_balance="1000.00"):
    response = client.post(
        ACCOUNTS, json={"name": name, "type": "bank", "opening_balance": opening_balance}, headers=headers
    )
    return response.json()["id"]


def category_id(client, headers, name):
    return next(c["id"] for c in client.get(CATEGORIES, headers=headers).json() if c["name"] == name)


def create_transaction(client, headers, account_id, category, amount, occurred_on="2026-09-10", description="Test"):
    return client.post(
        TRANSACTIONS,
        json={
            "account_id": account_id,
            "category_id": category,
            "amount": amount,
            "description": description,
            "occurred_on": occurred_on,
        },
        headers=headers,
    )


def test_create_expense_transaction(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    response = create_transaction(client, headers, account, category_id(client, headers, "Food"), "250.00", description="Biryani")

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "expense"
    assert body["amount"] == "250.00"
    assert body["account"]["name"] == "HDFC"
    assert body["category"]["name"] == "Food"


def test_type_is_derived_from_category(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    response = create_transaction(client, headers, account, category_id(client, headers, "Salary"), "50000.00")

    assert response.json()["type"] == "income"


def test_amount_must_be_positive(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    food = category_id(client, headers, "Food")

    assert create_transaction(client, headers, account, food, "0").status_code == 422
    assert create_transaction(client, headers, account, food, "-50.00").status_code == 422


def test_cannot_use_another_users_account(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    asha_account = create_account(client, asha)

    response = create_transaction(client, rahul, asha_account, category_id(client, rahul, "Food"), "100.00")
    assert response.status_code == 404


def test_cannot_read_another_users_transaction(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    account = create_account(client, asha)
    transaction_id = create_transaction(client, asha, account, category_id(client, asha, "Food"), "100.00").json()["id"]

    assert client.get(f"{TRANSACTIONS}/{transaction_id}", headers=rahul).status_code == 404


def test_account_balance_reflects_transactions(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers, opening_balance="1000.00")
    create_transaction(client, headers, account, category_id(client, headers, "Salary"), "5000.00")
    create_transaction(client, headers, account, category_id(client, headers, "Food"), "250.00")

    body = client.get(f"{ACCOUNTS}/{account}", headers=headers).json()
    assert body["opening_balance"] == "1000.00"
    assert body["current_balance"] == "5750.00"


def test_filter_and_paginate(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    food = category_id(client, headers, "Food")
    salary = category_id(client, headers, "Salary")
    create_transaction(client, headers, account, food, "100.00", occurred_on="2026-08-15")
    create_transaction(client, headers, account, food, "200.00", occurred_on="2026-09-05")
    create_transaction(client, headers, account, salary, "5000.00", occurred_on="2026-09-01")

    september = client.get(
        TRANSACTIONS, params={"start_date": "2026-09-01", "end_date": "2026-09-30"}, headers=headers
    ).json()
    assert september["total"] == 2

    expenses = client.get(TRANSACTIONS, params={"type": "expense"}, headers=headers).json()
    assert expenses["total"] == 2

    page = client.get(TRANSACTIONS, params={"limit": 1}, headers=headers).json()
    assert page["total"] == 3
    assert len(page["items"]) == 1
    assert page["items"][0]["occurred_on"] == "2026-09-05"


def test_invalid_date_range_returns_422(client, auth_headers_for):
    headers = auth_headers_for()
    response = client.get(
        TRANSACTIONS, params={"start_date": "2026-09-30", "end_date": "2026-09-01"}, headers=headers
    )

    assert response.status_code == 422


def test_changing_category_updates_type_and_balance(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers, opening_balance="0.00")
    transaction_id = create_transaction(
        client, headers, account, category_id(client, headers, "Food"), "300.00"
    ).json()["id"]
    assert client.get(f"{ACCOUNTS}/{account}", headers=headers).json()["current_balance"] == "-300.00"

    response = client.patch(
        f"{TRANSACTIONS}/{transaction_id}",
        json={"category_id": category_id(client, headers, "Salary")},
        headers=headers,
    )

    assert response.json()["type"] == "income"
    assert client.get(f"{ACCOUNTS}/{account}", headers=headers).json()["current_balance"] == "300.00"


def test_cannot_delete_account_with_transactions(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    create_transaction(client, headers, account, category_id(client, headers, "Food"), "100.00")

    assert client.delete(f"{ACCOUNTS}/{account}", headers=headers).status_code == 409


def test_cannot_delete_category_in_use(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    gym = client.post(CATEGORIES, json={"name": "Gym", "type": "expense"}, headers=headers).json()["id"]
    create_transaction(client, headers, account, gym, "1500.00")

    assert client.delete(f"{CATEGORIES}/{gym}", headers=headers).status_code == 409


def test_delete_transaction(client, auth_headers_for):
    headers = auth_headers_for()
    account = create_account(client, headers)
    transaction_id = create_transaction(
        client, headers, account, category_id(client, headers, "Food"), "100.00"
    ).json()["id"]

    assert client.delete(f"{TRANSACTIONS}/{transaction_id}", headers=headers).status_code == 204
    assert client.get(f"{TRANSACTIONS}/{transaction_id}", headers=headers).status_code == 404