from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, DbSession
from app.schemas.dashboard import DashboardSummary, MonthlyTrendPoint
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MonthParam = Annotated[str | None, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="YYYY-MM")]


@router.get("/summary", response_model=DashboardSummary)
def get_summary(current_user: CurrentUser, db: DbSession, month: MonthParam = None) -> DashboardSummary:
    return dashboard_service.get_summary(db, current_user, month)


@router.get("/trends", response_model=list[MonthlyTrendPoint])
def get_trends(
    current_user: CurrentUser,
    db: DbSession,
    months: Annotated[int, Query(ge=1, le=24)] = 6,
    end_month: MonthParam = None,
) -> list[MonthlyTrendPoint]:
    return dashboard_service.monthly_trend(db, current_user, months, end_month)