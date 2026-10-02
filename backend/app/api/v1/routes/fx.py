from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.currency import CurrencyCode
from app.core.dependencies import CurrentUser
from app.fx import FxProvider, get_fx_provider
from app.schemas.fx import FxRateResponse
from app.services import currency_service

router = APIRouter(prefix="/fx", tags=["fx"])

Fx = Annotated[FxProvider, Depends(get_fx_provider)]


# Signed-in only, so the API isn't an open proxy to the rate source.
@router.get("/rate", response_model=FxRateResponse)
def get_rate(
    current_user: CurrentUser,
    fx: Fx,
    base: Annotated[CurrencyCode, Query()],
    quote: Annotated[CurrencyCode, Query()],
) -> FxRateResponse:
    found = currency_service.get_quote(fx, base, quote)
    return FxRateResponse(base=found.base, quote=found.quote, rate=found.rate, date=found.date)
