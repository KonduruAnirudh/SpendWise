GROUPS = "/api/v1/groups"


def create_group(client, headers, name="Goa Trip"):
    return client.post(GROUPS, json={"name": name}, headers=headers).json()


def add_member(client, headers, group_id, **payload):
    return client.post(f"{GROUPS}/{group_id}/members", json=payload, headers=headers)


def test_creator_becomes_owner_member(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)

    assert group["currency"] == "INR"
    assert len(group["members"]) == 1
    owner = group["members"][0]
    assert owner["display_name"] == "Asha"
    assert owner["role"] == "owner"
    assert owner["is_guest"] is False
    assert group["my_member_id"] == owner["id"]


def test_list_shows_only_my_groups(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    create_group(client, asha, "Goa Trip")
    create_group(client, rahul, "Family")

    groups = client.get(GROUPS, headers=asha).json()
    assert [g["name"] for g in groups] == ["Goa Trip"]
    assert groups[0]["member_count"] == 1
    assert groups[0]["my_role"] == "owner"


def test_non_member_cannot_view_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group = create_group(client, asha)

    assert client.get(f"{GROUPS}/{group['id']}", headers=rahul).status_code == 404


def test_added_registered_member_can_see_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group = create_group(client, asha)

    response = add_member(client, asha, group["id"], email="rahul@example.com")
    assert response.status_code == 201
    assert response.json()["display_name"] == "Rahul"
    assert response.json()["is_guest"] is False

    rahul_groups = client.get(GROUPS, headers=rahul).json()
    assert [g["name"] for g in rahul_groups] == ["Goa Trip"]
    assert rahul_groups[0]["my_role"] == "member"


def test_add_guest_member(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)

    response = add_member(client, asha, group["id"], display_name="Arun")
    assert response.status_code == 201
    assert response.json()["is_guest"] is True


def test_duplicate_members_rejected(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    auth_headers_for("rahul@example.com", full_name="Rahul")
    group = create_group(client, asha)

    assert add_member(client, asha, group["id"], email="rahul@example.com").status_code == 201
    assert add_member(client, asha, group["id"], email="rahul@example.com").status_code == 409
    assert add_member(client, asha, group["id"], display_name="Arun").status_code == 201
    assert add_member(client, asha, group["id"], display_name="arun").status_code == 409


def test_unknown_email_returns_404(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)

    assert add_member(client, asha, group["id"], email="nobody@example.com").status_code == 404


def test_member_requires_email_or_name(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)

    assert add_member(client, asha, group["id"]).status_code == 422


def test_only_owner_can_remove_members_or_delete_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group = create_group(client, asha)
    add_member(client, asha, group["id"], email="rahul@example.com")
    arun = add_member(client, asha, group["id"], display_name="Arun").json()

    assert client.delete(f"{GROUPS}/{group['id']}/members/{arun['id']}", headers=rahul).status_code == 403
    assert client.delete(f"{GROUPS}/{group['id']}", headers=rahul).status_code == 403


def test_owner_cannot_be_removed(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)

    response = client.delete(f"{GROUPS}/{group['id']}/members/{group['my_member_id']}", headers=asha)
    assert response.status_code == 400


def test_member_ids_are_scoped_to_their_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    goa = create_group(client, asha, "Goa Trip")
    family = create_group(client, asha, "Family")
    arun_in_family = add_member(client, asha, family["id"], display_name="Arun").json()

    response = client.delete(f"{GROUPS}/{goa['id']}/members/{arun_in_family['id']}", headers=asha)
    assert response.status_code == 404


def test_owner_can_remove_member_and_delete_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)
    arun = add_member(client, asha, group["id"], display_name="Arun").json()

    assert client.delete(f"{GROUPS}/{group['id']}/members/{arun['id']}", headers=asha).status_code == 204
    assert len(client.get(f"{GROUPS}/{group['id']}/members", headers=asha).json()) == 1

    assert client.delete(f"{GROUPS}/{group['id']}", headers=asha).status_code == 204
    assert client.get(f"{GROUPS}/{group['id']}", headers=asha).status_code == 404

def test_owner_can_rename_and_toggle_simplify(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    group = create_group(client, asha)
    assert group["simplify_debts"] is False
    assert group["my_role"] == "owner"

    response = client.patch(f"{GROUPS}/{group['id']}", json={"name": " Goa 2026 ", "simplify_debts": True}, headers=asha)

    assert response.status_code == 200
    assert response.json()["name"] == "Goa 2026"
    assert response.json()["simplify_debts"] is True
    assert client.get(GROUPS, headers=asha).json()[0]["simplify_debts"] is True


def test_only_the_owner_can_edit_the_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    group = create_group(client, asha)
    add_member(client, asha, group["id"], username="rahul")

    response = client.patch(f"{GROUPS}/{group['id']}", json={"name": "Mine now"}, headers=rahul)

    assert response.status_code == 403
    assert client.get(f"{GROUPS}/{group['id']}", headers=rahul).json()["my_role"] == "member"


def test_group_name_cannot_be_blank(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    group = create_group(client, asha)

    assert client.patch(f"{GROUPS}/{group['id']}", json={"name": ""}, headers=asha).status_code == 422


def test_non_member_cannot_edit_group(client, auth_headers_for):
    asha = auth_headers_for("asha@example.com")
    rahul = auth_headers_for("rahul@example.com")
    group = create_group(client, asha)

    assert client.patch(f"{GROUPS}/{group['id']}", json={"name": "X"}, headers=rahul).status_code == 404
