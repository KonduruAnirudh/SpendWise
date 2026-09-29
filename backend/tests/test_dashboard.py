ACCOUNTS = "/api/v1/accounts"
CATEGORIES = "/api/v1/categories"
TRANSACTIONS = "/api/v1/transactions"
SUMMARY = "/api/v1/dashboard/summary"
TRENDS = "/api/v1/dashboard/trends"

DATASET = [
    ("Salary", "50000.00", "2026-08-01", "August salary"),
    ("Food", "2000.00", "2026-08-10", "Groceries"),
    ("Salary", "50000.00", "2026-09-01", "September salary"),
    ("Food", "3000.00", "2026-09-05", "Restaurants"),
    ("Travel", "6000.00", "2026-09-12", "Goa flights"),
    ("Shopping", "1000.00", "2026-09-20", "Shoes"),
]


def seed(client, headers):
    account = client.post(
        ACCOUNTS, json={"name": "HDFC", "type": "bank", "opening_balance": "10000.00"}, headers=headers
    ).json()["id"]
    categories = {c["name"]: c["id"] for c in client.get(CATEGORIES, headers=headers).json()}
    for category, amount, occurred_on, description in DATASET:
        client.post(
            TRANSACTIONS,
            json={
                "account_id": account,
                "category_id": categories[category],
                "amount": amount,
                "description": description,
                "occurred_on": occurred_on,
            },
            headers=headers,
        )


def test_summary_totals_and_net(client, auth_headers_for):
    headers = auth_headers_for()
    seed(client, headers)
    body = client.get(SUMMARY, params={"month": "2026-09"}, headers=headers).json()

    assert body["period_start"] == "2026-09-01"
    assert body["period_end"] == "2026-09-30"
    assert body["totals"] == {"income": "50000.00", "expense": "10000.00", "net": "40000.00"}


def test_spending_by_category_sorted_with_percentages(client, auth_headers_for):
    headers = auth_headers_for()
    seed(client, headers)
    body = client.get(SUMMARY, params={"month": "2026-09"}, headers=headers).json()

    breakdown = [(c["category_name"], c["total"], c["percentage"]) for c in body["spending_by_category"]]
    assert breakdown == [
        ("Travel", "6000.00", "60.0"),
        ("Food", "3000.00", "30.0"),
        ("Shopping", "1000.00", "10.0"),
    ]


def test_month_over_month_change(client, auth_headers_for):
    headers = auth_headers_for()
    seed(client, headers)
    body = client.get(SUMMARY, params={"month": "2026-09"}, headers=headers).json()

    assert body["previous_totals"]["expense"] == "2000.00"
    assert body["expense_change_percent"] == "400.0"


def test_total_balance_across_accounts(client, auth_headers_for):
    headers = auth_headers_for()
    seed(client, headers)
    client.post(ACCOUNTS, json={"name": "Wallet", "type": "cash", "opening_balance": "500.00"}, headers=headers)
    body = client.get(SUMMARY, params={"month": "2026-09"}, headers=headers).json()

    assert body["total_balance"] == "98500.00"


def test_largest_and_recent_transactions(client, auth_headers_for):
    headers = auth_headers_for()
    seed(client, headers)
    body = client.get(SUMMARY, params={"month": "2026-09"}, headers=headers).json()

    assert body["largest_expenses"][0]["description"] == "Goa flights"
    assert body["recent_transactions"][0]["description"] == "Shoes"


def test_empty_month_returns_zeros(client, auth_headers_for):
    headers = auth_headers_for()
    body = client.get(SUMMARY, params={"month": "2026-01"}, headers=headers).json()

    assert body["totals"] == {"income": "0.00", "expense": "0.00", "net": "0.00"}
    assert body["spending_by_category"] == []
    assert body["expense_change_percent"] is None


def test_invalid_month_returns_422(client, auth_headers_for):
    headers = auth_headers_for()

    assert client.get(SUMMARY, params={"month": "2026-13"}, headers=headers).status_code == 422


def test_trends_fill_missing_months(client, auth_headers_for):
    headers = auth_headers_for()
    seed(client, headers)
    points = client.get(TRENDS, params={"months": 3, "end_month": "2026-09"}, headers=headers).json()

    assert [p["month"] for p in points] == ["2026-07", "2026-08", "2026-09"]
    assert points[0] == {"month": "2026-07", "income": "0.00", "expense": "0.00", "net": "0.00"}
    assert points[1]["expense"] == "2000.00"
    assert points[2]["net"] == "40000.00"


def test_dashboard_excludes_other_users_data(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    seed(client, asha)
    body = client.get(SUMMARY, params={"month": "2026-09"}, headers=rahul).json()

    assert body["totals"]["expense"] == "0.00"
    assert body["total_balance"] == "0.00"