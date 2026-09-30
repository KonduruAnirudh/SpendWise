from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.formparsers import MultiPartParser

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.services.bills.files import MAX_BILL_BYTES

# Starlette buffers uploads in a SpooledTemporaryFile that rolls over to a temp file on disk above
# 1 MB. Bill photos must stay in memory, so keep anything up to the upload limit (plus headroom for
# the one byte past it that the endpoint reads) in RAM. Larger bodies should be refused before they
# reach the app, by the reverse proxy (e.g. nginx client_max_body_size) in production.
MultiPartParser.spool_max_size = MAX_BILL_BYTES + 1024 * 1024


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="Personal finance and expense-sharing API with an AI financial assistant.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()