import json
from datetime import date

import pytest

from app.ai.chat_service import FALLBACK_REPLY, MAX_TOOL_ROUNDS
from app.ai.providers import LLMProviderError, LLMResponse, ToolCall, get_llm_provider
from app.main import app

CHAT = "/api/v1/ai/chat"
CONVERSATIONS = "/api/v1/ai/conversations"


class ScriptedProvider:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.calls = []

    def chat(self, messages, tools):
        self.calls.append(list(messages))
        return self.responses.pop(0) if self.responses else LLMResponse(content="(script finished)")

    def vision(self, prompt, image, media_type):
        raise AssertionError("the chat assistant never sends images")


class FailingProvider:
    def chat(self, messages, tools):
        raise LLMProviderError("connection refused")

    def vision(self, prompt, image, media_type):
        raise LLMProviderError("connection refused")


def tool_call(name, **arguments):
    return LLMResponse(content="", tool_calls=(ToolCall(id=f"call_{name}", name=name, arguments=json.dumps(arguments)),))


def answer(text):
    return LLMResponse(content=text)


def last_tool_result(provider, call_index=1):
    return json.loads(provider.calls[call_index][-1].content)


@pytest.fixture()
def use_provider(client):
    def _install(provider):
        app.dependency_overrides[get_llm_provider] = lambda: provider
        return provider

    return _install


def seed_september(client, headers):
    account = client.post(
        "/api/v1/accounts", json={"name": "HDFC", "type": "bank", "opening_balance": "0"}, headers=headers
    ).json()["id"]
    categories = {c["name"]: c["id"] for c in client.get("/api/v1/categories", headers=headers).json()}
    for category, amount, day in [("Food", "3000.00", "2026-09-05"), ("Travel", "6000.00", "2026-09-12")]:
        client.post(
            "/api/v1/transactions",
            json={
                "account_id": account,
                "category_id": categories[category],
                "amount": amount,
                "description": category,
                "occurred_on": day,
            },
            headers=headers,
        )


FOOD_IN_SEPTEMBER = {"start_date": "2026-09-01", "end_date": "2026-09-30", "category": "Food"}


def test_assistant_answers_from_tool_data(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    seed_september(client, asha)
    provider = use_provider(
        ScriptedProvider(tool_call("get_spending_summary", **FOOD_IN_SEPTEMBER), answer("You spent 3000.00 on food."))
    )

    response = client.post(CHAT, json={"message": "How much did I spend on food in September?"}, headers=asha)

    assert response.status_code == 200
    assert response.json()["tools_used"] == ["get_spending_summary"]
    assert response.json()["reply"] == "You spent 3000.00 on food."
    result = last_tool_result(provider)
    assert result["ok"] is True
    assert result["data"]["expense"] == "3000.00"


def test_tools_only_see_the_callers_data(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    seed_september(client, asha)
    provider = use_provider(ScriptedProvider(tool_call("get_spending_summary", **FOOD_IN_SEPTEMBER), answer("Done")))

    client.post(CHAT, json={"message": "How much did I spend on food?"}, headers=rahul)

    assert last_tool_result(provider)["data"]["expense"] == "0.00"


def test_invalid_tool_arguments_are_reported_to_the_model(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    provider = use_provider(
        ScriptedProvider(
            tool_call("get_spending_summary", start_date="last month", end_date="2026-09-30"), answer("Retrying")
        )
    )

    client.post(CHAT, json={"message": "Spending last month?"}, headers=asha)

    result = last_tool_result(provider)
    assert result["ok"] is False
    assert "start_date" in result["error"]


def test_unknown_category_lists_available_ones(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    provider = use_provider(
        ScriptedProvider(
            tool_call("get_spending_summary", start_date="2026-09-01", end_date="2026-09-30", category="Crypto"),
            answer("No such category"),
        )
    )

    client.post(CHAT, json={"message": "Crypto spending?"}, headers=asha)

    assert "Available categories" in last_tool_result(provider)["error"]


def test_unknown_tool_is_rejected(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    provider = use_provider(ScriptedProvider(tool_call("delete_all_transactions"), answer("I can't do that")))

    client.post(CHAT, json={"message": "Delete everything"}, headers=asha)

    assert "Unknown tool" in last_tool_result(provider)["error"]


def test_tool_loop_is_capped(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    endless = [tool_call("get_account_balances") for _ in range(MAX_TOOL_ROUNDS + 5)]
    provider = use_provider(ScriptedProvider(*endless))

    response = client.post(CHAT, json={"message": "Balances?"}, headers=asha)

    assert response.json()["reply"] == FALLBACK_REPLY
    assert len(provider.calls) == MAX_TOOL_ROUNDS


def test_system_prompt_has_today_and_currency(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    provider = use_provider(ScriptedProvider(answer("Hi")))

    client.post(CHAT, json={"message": "Hello"}, headers=asha)

    system_prompt = provider.calls[0][0].content
    assert date.today().isoformat() in system_prompt
    assert "INR" in system_prompt


def test_conversation_history_is_saved_used_and_private(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    rahul = auth_headers_for("rahul@example.com", full_name="Rahul")
    use_provider(ScriptedProvider(answer("Hello Asha")))
    conversation_id = client.post(CHAT, json={"message": "Hi"}, headers=asha).json()["conversation_id"]

    messages = client.get(f"{CONVERSATIONS}/{conversation_id}/messages", headers=asha).json()
    assert [m["role"] for m in messages] == ["user", "assistant"]

    follow_up = use_provider(ScriptedProvider(answer("Again")))
    client.post(CHAT, json={"message": "And now?", "conversation_id": conversation_id}, headers=asha)
    assert [m.content for m in follow_up.calls[0][1:]] == ["Hi", "Hello Asha", "And now?"]

    assert client.get(f"{CONVERSATIONS}/{conversation_id}/messages", headers=rahul).status_code == 404
    assert client.post(CHAT, json={"message": "x", "conversation_id": conversation_id}, headers=rahul).status_code == 404


def test_provider_failure_returns_503(client, auth_headers_for, use_provider):
    asha = auth_headers_for("asha@example.com", full_name="Asha")
    use_provider(FailingProvider())

    response = client.post(CHAT, json={"message": "Hello"}, headers=asha)

    assert response.status_code == 503
    assert client.get(CONVERSATIONS, headers=asha).json() == []