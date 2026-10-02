GROUPS = "/api/v1/groups"
MY_GROUP_BALANCES = "/api/v1/users/me/group-balances"


def setup_goa(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group_id = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()["id"]
    client.post(f"{GROUPS}/{group_id}/members", json={"email": "rahul@example.com"}, headers=asha)
    client.post(f"{GROUPS}/{group_id}/members", json={"display_name": "Arun"}, headers=asha)
    members = {m["display_name"]: m["id"] for m in client.get(f"{GROUPS}/{group_id}/members", headers=asha).json()}
    return asha, rahul, group_id, members


def add_expense(client, headers, group_id, members, payer, amount, method="equal", participants=None):
    if participants is None:
        participants = [{"member_id": member_id} for member_id in members.values()]
    return client.post(
        f"{GROUPS}/{group_id}/expenses",
        json={
            "description": "Expense",
            "amount": amount,
            "paid_by_member_id": members[payer],
            "split_method": method,
            "participants": participants,
        },
        headers=headers,
    )


def settle(client, headers, group_id, members, payer, receiver, amount):
    return client.post(
        f"{GROUPS}/{group_id}/settlements",
        json={"from_member_id": members[payer], "to_member_id": members[receiver], "amount": amount},
        headers=headers,
    )


def nets(client, headers, group_id):
    body = client.get(f"{GROUPS}/{group_id}/balances", headers=headers).json()
    return {m["display_name"]: m["net"] for m in body["members"]}


def suggested(client, headers, group_id):
    body = client.get(f"{GROUPS}/{group_id}/settlements/suggested", headers=headers).json()
    return [(s["from_member"]["display_name"], s["to_member"]["display_name"], s["amount"]) for s in body]


def test_balances_after_equal_dinner(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")

    assert nets(client, asha, group_id) == {"Asha": "2000.00", "Rahul": "-1000.00", "Arun": "-1000.00"}
    assert client.get(f"{GROUPS}/{group_id}/balances", headers=asha).json()["is_settled"] is False


def test_suggested_settlements(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")

    assert suggested(client, asha, group_id) == [
        ("Rahul", "Asha", "1000.00"),
        ("Arun", "Asha", "1000.00"),
    ]


def test_recording_a_settlement_updates_balances(client, auth_headers_for):
    asha, rahul, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")

    assert settle(client, rahul, group_id, members, "Rahul", "Asha", "1000.00").status_code == 201
    assert nets(client, asha, group_id) == {"Asha": "1000.00", "Rahul": "0.00", "Arun": "-1000.00"}
    assert suggested(client, asha, group_id) == [("Arun", "Asha", "1000.00")]


def test_fully_settled_group(client, auth_headers_for):
    asha, rahul, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")
    settle(client, rahul, group_id, members, "Rahul", "Asha", "1000.00")
    settle(client, asha, group_id, members, "Arun", "Asha", "1000.00")

    body = client.get(f"{GROUPS}/{group_id}/balances", headers=asha).json()
    assert body["is_settled"] is True
    assert suggested(client, asha, group_id) == []


def test_debt_chain_is_paid_pair_by_pair_by_default(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "500.00", "reimbursement", [{"member_id": members["Rahul"]}])
    add_expense(client, asha, group_id, members, "Rahul", "500.00", "reimbursement", [{"member_id": members["Arun"]}])

    assert nets(client, asha, group_id) == {"Asha": "500.00", "Rahul": "0.00", "Arun": "-500.00"}
    assert suggested(client, asha, group_id) == [("Rahul", "Asha", "500.00"), ("Arun", "Rahul", "500.00")]


def test_debt_chain_is_simplified_when_the_group_opts_in(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "500.00", "reimbursement", [{"member_id": members["Rahul"]}])
    add_expense(client, asha, group_id, members, "Rahul", "500.00", "reimbursement", [{"member_id": members["Arun"]}])

    client.patch(f"{GROUPS}/{group_id}", json={"simplify_debts": True}, headers=asha)

    assert suggested(client, asha, group_id) == [("Arun", "Asha", "500.00")]


def test_each_person_pays_whoever_paid_for_them(client, auth_headers_for):
    """Two payers, two who owe: debts stay with the person who actually paid (Lonavala bug)."""
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group_id = client.post(GROUPS, json={"name": "Lonavala"}, headers=asha).json()["id"]
    for name in ["Jhon", "Joey", "Ross"]:
        client.post(f"{GROUPS}/{group_id}/members", json={"display_name": name}, headers=asha)
    members = {m["display_name"]: m["id"] for m in client.get(f"{GROUPS}/{group_id}/members", headers=asha).json()}
    add_expense(client, asha, group_id, members, "Asha", "400.00")
    add_expense(client, asha, group_id, members, "Jhon", "400.00")

    assert suggested(client, asha, group_id) == [
        ("Joey", "Asha", "100.00"),
        ("Ross", "Asha", "100.00"),
        ("Joey", "Jhon", "100.00"),
        ("Ross", "Jhon", "100.00"),
    ]

    settle(client, asha, group_id, members, "Joey", "Asha", "100.00")
    assert ("Joey", "Asha", "100.00") not in suggested(client, asha, group_id)


def test_my_group_balances_follow_the_groups_setting(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "500.00", "reimbursement", [{"member_id": members["Rahul"]}])
    add_expense(client, asha, group_id, members, "Rahul", "500.00", "reimbursement", [{"member_id": members["Arun"]}])

    def owed_to_asha():
        position = client.get(MY_GROUP_BALANCES, headers=asha).json()[0]
        return [(s["from_member"]["display_name"], s["amount"]) for s in position["owed_to_me"]]

    assert owed_to_asha() == [("Rahul", "500.00")]
    client.patch(f"{GROUPS}/{group_id}", json={"simplify_debts": True}, headers=asha)
    assert owed_to_asha() == [("Arun", "500.00")]


def test_settlement_members_must_be_in_group(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    family_id = client.post(GROUPS, json={"name": "Family"}, headers=asha).json()["id"]
    dad = client.post(f"{GROUPS}/{family_id}/members", json={"display_name": "Dad"}, headers=asha).json()

    response = client.post(
        f"{GROUPS}/{group_id}/settlements",
        json={"from_member_id": dad["id"], "to_member_id": members["Asha"], "amount": "100.00"},
        headers=asha,
    )
    assert response.status_code == 400


def test_cannot_settle_with_self(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)

    assert settle(client, asha, group_id, members, "Asha", "Asha", "100.00").status_code == 400


def test_balances_are_group_specific(client, auth_headers_for):
    asha, _, goa_id, goa_members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, goa_id, goa_members, "Asha", "3000.00")

    family_id = client.post(GROUPS, json={"name": "Family"}, headers=asha).json()["id"]
    client.post(f"{GROUPS}/{family_id}/members", json={"display_name": "Dad"}, headers=asha)
    family_members = {
        m["display_name"]: m["id"] for m in client.get(f"{GROUPS}/{family_id}/members", headers=asha).json()
    }
    add_expense(
        client, asha, family_id, family_members, "Dad", "500.00", "reimbursement",
        [{"member_id": family_members["Asha"]}],
    )

    assert nets(client, asha, family_id) == {"Asha": "-500.00", "Dad": "500.00"}
    assert nets(client, asha, goa_id)["Asha"] == "2000.00"


def test_my_group_balances_across_groups(client, auth_headers_for):
    asha, rahul, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")

    rahul_view = client.get(MY_GROUP_BALANCES, headers=rahul).json()
    assert len(rahul_view) == 1
    assert rahul_view[0]["group_name"] == "Goa Trip"
    assert rahul_view[0]["my_net"] == "-1000.00"
    assert [(s["to_member"]["display_name"], s["amount"]) for s in rahul_view[0]["i_owe"]] == [("Asha", "1000.00")]

    asha_view = client.get(MY_GROUP_BALANCES, headers=asha).json()
    assert len(asha_view[0]["owed_to_me"]) == 2


def test_undo_settlement_restores_balances(client, auth_headers_for):
    asha, rahul, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")
    settlement_id = settle(client, rahul, group_id, members, "Rahul", "Asha", "1000.00").json()["id"]

    assert client.delete(f"{GROUPS}/{group_id}/settlements/{settlement_id}", headers=asha).status_code == 204
    assert nets(client, asha, group_id)["Rahul"] == "-1000.00"


def test_group_with_settlements_can_be_deleted(client, auth_headers_for):
    asha, rahul, group_id, members = setup_goa(client, auth_headers_for)
    add_expense(client, asha, group_id, members, "Asha", "3000.00")
    settle(client, rahul, group_id, members, "Rahul", "Asha", "1000.00")

    assert client.delete(f"{GROUPS}/{group_id}", headers=asha).status_code == 204