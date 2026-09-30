from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.ai.providers import LLMProvider, get_llm_provider
from app.core.dependencies import GroupMembership
from app.schemas.bill import BillDraft
from app.services import bills
from app.services.bills.files import MAX_BILL_BYTES

router = APIRouter(prefix="/groups/{group_id}/bills", tags=["bills"])

Provider = Annotated[LLMProvider, Depends(get_llm_provider)]


@router.post(
    "/parse",
    response_model=BillDraft,
    responses={
        400: {"description": "Unreadable image, or a PDF without text"},
        413: {"description": "File larger than 5 MB"},
        415: {"description": "Not a JPEG, PNG, WebP or PDF"},
        502: {"description": "The model's reply couldn't be understood"},
        503: {"description": "The model server is unavailable"},
    },
)
def parse_bill(membership: GroupMembership, provider: Provider, file: Annotated[UploadFile, File()]) -> BillDraft:
    """Read a bill photo or PDF into an editable draft. Nothing is saved: the user reviews the draft
    and posts it as an itemized expense."""
    # One byte over the limit is enough to know the file is too large.
    data = file.file.read(MAX_BILL_BYTES + 1)
    return bills.parse_bill(provider, data, membership.group.currency)
