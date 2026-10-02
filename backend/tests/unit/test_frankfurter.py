from datetime import date
from decimal import Decimal

import httpx
import pytest

from app.fx import FxUnavailableError
from app.fx.frankfurter import FrankfurterProvider


def provider(handler) -> FrankfurterProvider:
    return FrankfurterProvider("https://fx.test/v1", client=httpx.Client(transport=httpx.MockTransport(handler)))


def ecb(rates):
    return lambda request: httpx.Response(200, json={"amount": 1.0, "base": "EUR", "date": "2026-10-01", "rates": rates})


def test_crosses_through_the_euro_for_precision():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.update(request.url.params)
        return ecb({"GBP": 0.85373, "INR": 108.832})(request)

    quote = provider(handler).quote("INR", "GBP")

    assert seen == {"base": "EUR", "symbols": "GBP,INR"}
    assert quote.rate == Decimal("0.0078444759")  # 0.85373 / 108.832, not the API's rounded 0.00784
    assert quote.date == date(2026, 10, 1)


def test_euro_on_either_side():
    rates = {"INR": 108.832}

    assert provider(ecb(rates)).quote("EUR", "INR").rate == Decimal("108.832")
    assert provider(ecb(rates)).quote("INR", "EUR").rate == Decimal("0.0091884740")


def test_same_currency_needs_no_request():
    def handler(request):
        raise AssertionError("no request expected")

    assert provider(handler).quote("EUR", "EUR").rate == 1


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(503),
        httpx.Response(200, json={"rates": {}}),
        httpx.Response(200, json={"date": "2026-10-01", "rates": {"USD": 0, "INR": 108.8}}),
        httpx.Response(200, text="not json"),
    ],
)
def test_bad_answers_become_fx_unavailable(response):
    with pytest.raises(FxUnavailableError):
        provider(lambda request: response).quote("INR", "USD")


def test_network_errors_become_fx_unavailable():
    def handler(request):
        raise httpx.ConnectError("down")

    with pytest.raises(FxUnavailableError):
        provider(handler).quote("INR", "USD")
