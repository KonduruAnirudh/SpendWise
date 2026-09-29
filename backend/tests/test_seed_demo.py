from datetime import date
from decimal import Decimal

from sqlalchemy import func, select

from app.models.user import User
from scripts.seed_demo import DEMO_EMAIL, DEMO_PASSWORD, seed_demo

TODAY = date(2026, 9, 29)


def test_seed_demo_is_repeatable_balanced_and_leaves_other_users_alone(db, client, auth_headers_for):
    other = auth_headers_for("someone@example.com")
    client.post("/api/v1/accounts", json={"name": "Mine", "type": "cash", "opening_balance": "10.00"}, headers=other)

    first = seed_demo(db, today=TODAY)
    second = seed_demo(db, today=TODAY)

    assert second["transactions"] == first["transactions"] > 100
    assert db.scalar(select(func.count()).select_from(User).where(User.email == DEMO_EMAIL)) == 1
    assert [a["name"] for a in client.get("/api/v1/accounts", headers=other).json()] == ["Mine"]

    login = client.post("/api/v1/auth/login", data={"username": DEMO_EMAIL, "password": DEMO_PASSWORD})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert len(client.get("/api/v1/accounts", headers=headers).json()) == 5
    groups = client.get("/api/v1/groups", headers=headers).json()
    assert {group["name"] for group in groups} == {"Goa Trip", "Flatmates"}
    for group in groups:
        balances = client.get(f"/api/v1/groups/{group['id']}/balances", headers=headers).json()
        assert sum(Decimal(member["net"]) for member in balances["members"]) == 0

    goa = next(group for group in groups if group["name"] == "Goa Trip")
    methods = {e["split_method"] for e in client.get(f"/api/v1/groups/{goa['id']}/expenses", headers=headers).json()}
    assert methods == {"equal", "exact", "percentage", "shares", "adjustment", "reimbursement", "itemized"}
