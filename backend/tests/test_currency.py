from decimal import Decimal

ME = "/api/v1/users/me"
CHANGE = "/api/v1/users/me/currency"
RATE = "/api/v1/fx/rate"
GROUPS = "/api/v1/groups"


def make_account(client, headers, opening="1000.00"):
    return client.post("/api/v1/accounts", json={"name": "HDFC", "type": "bank", "opening_balance": opening}, headers=headers).json()


def expense_category(client, headers):
    return next(c for c in client.get("/api/v1/categories", headers=headers).json() if c["type"] == "expense")["id"]


def make_transaction(client, headers, account_id, category_id, amount):
    body = {"account_id": account_id, "category_id": category_id, "amount": amount, "description": "Lunch"}
    return client.post("/api/v1/transactions", json=body, headers=headers).json()


# ---------- rates ----------

def test_rate_lookup(client, auth_headers_for):
    headers = auth_headers_for()

    response = client.get(RATE, params={"base": "INR", "quote": "USD"}, headers=headers)

    assert response.status_code == 200
    assert response.json() == {"base": "INR", "quote": "USD", "rate": "0.012", "date": "2026-10-01"}


def test_rate_lookup_needs_sign_in_and_a_supported_currency(client, auth_headers_for):
    headers = auth_headers_for()

    assert client.get(RATE, params={"base": "INR", "quote": "USD"}).status_code == 401
    assert client.get(RATE, params={"base": "INR", "quote": "JPY"}, headers=headers).status_code == 422


# ---------- the user's own money ----------

def test_changing_currency_converts_accounts_and_transactions(client, auth_headers_for):
    headers = auth_headers_for()
    account = make_account(client, headers, "1000.00")
    category = expense_category(client, headers)
    make_transaction(client, headers, account["id"], category, "250.00")
    make_transaction(client, headers, account["id"], category, "0.40")  # 0.0048 USD: must not become 0

    response = client.post(CHANGE, json={"currency": "USD"}, headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["currency"] == "USD"
    assert body["rate"] == "0.012"
    assert body["converted"] == {"accounts": 1, "transactions": 2}
    accounts = client.get("/api/v1/accounts", headers=headers).json()
    assert accounts[0]["currency"] == "USD"
    assert accounts[0]["opening_balance"] == "12.00"
    amounts = sorted(t["amount"] for t in client.get("/api/v1/transactions", headers=headers).json()["items"])
    assert amounts == ["0.01", "3.00"]
    assert accounts[0]["current_balance"] == str(Decimal("12.00") - Decimal("3.01"))
    assert client.get(ME, headers=headers).json()["currency"] == "USD"


def test_new_accounts_use_the_new_currency(client, auth_headers_for):
    headers = auth_headers_for()
    client.post(CHANGE, json={"currency": "GBP"}, headers=headers)

    assert make_account(client, headers)["currency"] == "GBP"


def test_same_or_unsupported_currency_is_rejected(client, auth_headers_for):
    headers = auth_headers_for()

    assert client.post(CHANGE, json={"currency": "INR"}, headers=headers).status_code == 400
    assert client.post(CHANGE, json={"currency": "JPY"}, headers=headers).status_code == 422


def test_nothing_changes_when_rates_are_unavailable(client, auth_headers_for, fx):
    headers = auth_headers_for()
    make_account(client, headers, "1000.00")
    fx.available = False

    response = client.post(CHANGE, json={"currency": "USD"}, headers=headers)

    assert response.status_code == 503
    assert "nothing was converted" in response.json()["detail"]
    assert client.get(ME, headers=headers).json()["currency"] == "INR"
    assert client.get("/api/v1/accounts", headers=headers).json()[0]["opening_balance"] == "1000.00"


def test_changing_your_currency_leaves_shared_groups_alone(client, auth_headers_for):
    headers = auth_headers_for()
    group = client.post(GROUPS, json={"name": "Goa"}, headers=headers).json()

    client.post(CHANGE, json={"currency": "USD"}, headers=headers)

    assert client.get(f"{GROUPS}/{group['id']}", headers=headers).json()["currency"] == "INR"


def test_registering_with_an_unsupported_currency_is_rejected(client):
    body = {"email": "x@example.com", "password": "supersecret1", "full_name": "X", "currency": "JPY"}

    assert client.post("/api/v1/auth/register", json=body).status_code == 422


# ---------- a group's money ----------

def setup_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group_id = client.post(GROUPS, json={"name": "Goa"}, headers=asha).json()["id"]
    for name in ["Rahul", "Arun"]:
        client.post(f"{GROUPS}/{group_id}/members", json={"display_name": name}, headers=asha)
    members = {m["display_name"]: m["id"] for m in client.get(f"{GROUPS}/{group_id}/members", headers=asha).json()}
    return asha, group_id, members


def add_equal_expense(client, headers, group_id, members, payer, amount):
    return client.post(
        f"{GROUPS}/{group_id}/expenses",
        json={
            "description": "Dinner",
            "amount": amount,
            "paid_by_member_id": members[payer],
            "split_method": "equal",
            "participants": [{"member_id": m} for m in members.values()],
        },
        headers=headers,
    )


def test_owner_converts_a_group_and_every_split_still_adds_up(client, auth_headers_for):
    asha, group_id, members = setup_group(client, auth_headers_for)
    add_equal_expense(client, asha, group_id, members, "Asha", "3000.00")
    add_equal_expense(client, asha, group_id, members, "Rahul", "100.00")
    client.post(
        f"{GROUPS}/{group_id}/settlements",
        json={"from_member_id": members["Arun"], "to_member_id": members["Asha"], "amount": "500.00"},
        headers=asha,
    )

    response = client.patch(f"{GROUPS}/{group_id}", json={"currency": "EUR"}, headers=asha)

    assert response.status_code == 200
    assert response.json()["currency"] == "EUR"
    expenses = client.get(f"{GROUPS}/{group_id}/expenses", headers=asha).json()
    for expense in expenses:
        assert sum(Decimal(s["amount"]) for s in expense["splits"]) == Decimal(expense["amount"])
    assert sorted(e["amount"] for e in expenses) == ["1.00", "30.00"]
    assert client.get(f"{GROUPS}/{group_id}/settlements", headers=asha).json()[0]["amount"] == "5.00"
    balances = client.get(f"{GROUPS}/{group_id}/balances", headers=asha).json()
    assert balances["currency"] == "EUR"
    assert sum(Decimal(m["net"]) for m in balances["members"]) == 0


def test_tiny_expenses_drop_zero_shares_instead_of_breaking(client, auth_headers_for):
    asha, group_id, members = setup_group(client, auth_headers_for)
    add_equal_expense(client, asha, group_id, members, "Asha", "1.00")  # → 0.01 USD for three people

    assert client.patch(f"{GROUPS}/{group_id}", json={"currency": "USD"}, headers=asha).status_code == 200

    expense = client.get(f"{GROUPS}/{group_id}/expenses", headers=asha).json()[0]
    assert expense["amount"] == "0.01"
    assert [s["amount"] for s in expense["splits"]] == ["0.01"]


def test_only_the_owner_can_change_a_groups_currency(client, auth_headers_for, fx):
    asha, group_id, _ = setup_group(client, auth_headers_for)
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul R")
    client.post(f"{GROUPS}/{group_id}/members", json={"username": "rahul"}, headers=asha)

    response = client.patch(f"{GROUPS}/{group_id}", json={"currency": "USD"}, headers=rahul)

    assert response.status_code == 403
    assert fx.calls == []


def test_group_conversion_is_all_or_nothing(client, auth_headers_for, fx):
    asha, group_id, members = setup_group(client, auth_headers_for)
    add_equal_expense(client, asha, group_id, members, "Asha", "300.00")
    fx.available = False

    response = client.patch(f"{GROUPS}/{group_id}", json={"name": "Renamed", "currency": "USD"}, headers=asha)

    assert response.status_code == 503
    group = client.get(f"{GROUPS}/{group_id}", headers=asha).json()
    assert (group["name"], group["currency"]) == ("Goa", "INR")


def test_editing_a_group_without_a_currency_change_needs_no_rates(client, auth_headers_for, fx):
    asha, group_id, _ = setup_group(client, auth_headers_for)

    client.patch(f"{GROUPS}/{group_id}", json={"name": "Goa 2026", "currency": "INR"}, headers=asha)

    assert fx.calls == []


def test_a_group_can_start_in_any_supported_currency(client, auth_headers_for):
    asha = auth_headers_for()

    assert client.post(GROUPS, json={"name": "NYC", "currency": "USD"}, headers=asha).json()["currency"] == "USD"
    assert client.post(GROUPS, json={"name": "Tokyo", "currency": "JPY"}, headers=asha).status_code == 422
