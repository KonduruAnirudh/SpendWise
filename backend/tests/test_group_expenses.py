GROUPS = "/api/v1/groups"


def setup_goa(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group_id = client.post(GROUPS, json={"name": "Goa Trip"}, headers=asha).json()["id"]
    client.post(f"{GROUPS}/{group_id}/members", json={"email": "rahul@example.com"}, headers=asha)
    client.post(f"{GROUPS}/{group_id}/members", json={"display_name": "Arun"}, headers=asha)
    members = {m["display_name"]: m["id"] for m in client.get(f"{GROUPS}/{group_id}/members", headers=asha).json()}
    return asha, rahul, group_id, members


def expenses_url(group_id):
    return f"{GROUPS}/{group_id}/expenses"


def dinner(members, method="equal", participants=None, **extra):
    return {
        "description": "Dinner",
        "amount": "3000.00",
        "paid_by_member_id": members["Asha"],
        "split_method": method,
        "participants": participants if participants is not None else [{"member_id": m} for m in members.values()],
        **extra,
    }


def owed(body):
    return {split["display_name"]: split["amount"] for split in body["splits"]}


def test_equal_split_via_api(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    response = client.post(expenses_url(group_id), json=dinner(members), headers=asha)

    assert response.status_code == 201
    body = response.json()
    assert body["paid_by"]["display_name"] == "Asha"
    assert owed(body) == {"Asha": "1000.00", "Rahul": "1000.00", "Arun": "1000.00"}


def test_exact_split_must_match_total(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    participants = [
        {"member_id": members["Asha"], "value": "1500"},
        {"member_id": members["Rahul"], "value": "1000"},
        {"member_id": members["Arun"], "value": "400"},
    ]
    response = client.post(expenses_url(group_id), json=dinner(members, "exact", participants), headers=asha)

    assert response.status_code == 400
    assert "add up to 2900.00" in response.json()["detail"]


def test_itemized_split_via_api(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    payload = dinner(
        members,
        "itemized",
        participants=[],
        amount="1000.00",
        items=[
            {"description": "Pizza", "amount": "600.00", "member_ids": [members["Asha"], members["Rahul"]]},
            {"description": "Beer", "amount": "400.00", "member_ids": [members["Rahul"], members["Arun"]]},
        ],
    )
    response = client.post(expenses_url(group_id), json=payload, headers=asha)

    assert response.status_code == 201
    assert owed(response.json()) == {"Asha": "300.00", "Rahul": "500.00", "Arun": "200.00"}


def test_participant_from_another_group_is_rejected(client, auth_headers_for):
    asha, _, goa_id, members = setup_goa(client, auth_headers_for)
    family_id = client.post(GROUPS, json={"name": "Family"}, headers=asha).json()["id"]
    dad = client.post(f"{GROUPS}/{family_id}/members", json={"display_name": "Dad"}, headers=asha).json()

    participants = [{"member_id": members["Asha"]}, {"member_id": dad["id"]}]
    response = client.post(expenses_url(goa_id), json=dinner(members, participants=participants), headers=asha)

    assert response.status_code == 400


def test_non_member_cannot_add_expense(client, auth_headers_for):
    _, _, group_id, members = setup_goa(client, auth_headers_for)
    priya = auth_headers_for("priya@example.com", full_name="Priya")

    assert client.post(expenses_url(group_id), json=dinner(members), headers=priya).status_code == 404


def test_expenses_are_isolated_per_group(client, auth_headers_for):
    asha, _, goa_id, members = setup_goa(client, auth_headers_for)
    family_id = client.post(GROUPS, json={"name": "Family"}, headers=asha).json()["id"]
    client.post(expenses_url(goa_id), json=dinner(members), headers=asha)

    assert len(client.get(expenses_url(goa_id), headers=asha).json()) == 1
    assert client.get(expenses_url(family_id), headers=asha).json() == []


def test_only_creator_or_owner_can_delete_expense(client, auth_headers_for):
    asha, rahul, group_id, members = setup_goa(client, auth_headers_for)
    expense_id = client.post(expenses_url(group_id), json=dinner(members), headers=asha).json()["id"]

    assert client.delete(f"{expenses_url(group_id)}/{expense_id}", headers=rahul).status_code == 403
    assert client.delete(f"{expenses_url(group_id)}/{expense_id}", headers=asha).status_code == 204


def test_member_with_expenses_cannot_be_removed(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    client.post(expenses_url(group_id), json=dinner(members), headers=asha)

    response = client.delete(f"{GROUPS}/{group_id}/members/{members['Arun']}", headers=asha)
    assert response.status_code == 409


def test_group_with_expenses_can_be_deleted(client, auth_headers_for):
    asha, _, group_id, members = setup_goa(client, auth_headers_for)
    client.post(expenses_url(group_id), json=dinner(members), headers=asha)

    assert client.delete(f"{GROUPS}/{group_id}", headers=asha).status_code == 204
    assert client.get(f"{GROUPS}/{group_id}", headers=asha).status_code == 404