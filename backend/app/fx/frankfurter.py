from datetime import date
from decimal import Decimal, InvalidOperation

import httpx

from app.fx.base import FxQuote, FxUnavailableError

# 10 decimal places keeps tiny rates (INR→GBP ≈ 0.0078445) precise.
RATE_PLACES = Decimal("1e-10")


class FrankfurterProvider:
    """European Central Bank reference rates via the Frankfurter API (free, no key).

    The ECB publishes rates against the euro, once per working day, so a rate can be a day or
    two old. Other pairs are crossed through the euro (INR→GBP = EUR→GBP / EUR→INR): the API's
    own cross rates are rounded to 5 decimal places, which loses precision for small rates.
    """

    def __init__(self, base_url: str, timeout: float = 10.0, client: httpx.Client | None = None):
        self._base_url = base_url.rstrip("/")
        self._client = client or httpx.Client(timeout=timeout)

    def quote(self, base: str, quote: str) -> FxQuote:
        if base == quote:
            return FxQuote(base, quote, Decimal(1), date.today())
        per_euro, published = self._per_euro({base, quote} - {"EUR"})
        rate = (per_euro[quote] / per_euro[base]).quantize(RATE_PLACES)
        return FxQuote(base, quote, rate, published)

    def _per_euro(self, codes: set[str]) -> tuple[dict[str, Decimal], date]:
        try:
            response = self._client.get(
                f"{self._base_url}/latest", params={"base": "EUR", "symbols": ",".join(sorted(codes))}
            )
            response.raise_for_status()
            body = response.json()
            # str() first: the JSON float 108.832 must not become 108.8319999...
            rates = {code: Decimal(str(body["rates"][code])) for code in codes}
            published = date.fromisoformat(body["date"])
        except (httpx.HTTPError, KeyError, TypeError, ValueError, InvalidOperation) as error:
            raise FxUnavailableError(f"No rates for {sorted(codes)}: {error}") from error
        if any(rate <= 0 for rate in rates.values()):
            raise FxUnavailableError(f"Unusable rates: {rates}")
        return {"EUR": Decimal(1), **rates}, published
