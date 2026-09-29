from fastapi import APIRouter

from app.api.v1.routes import (
    accounts,
    ai,
    auth,
    categories,
    dashboard,
    group_expenses,
    group_settlements,
    groups,
    health,
    transactions,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(accounts.router)
api_router.include_router(categories.router)
api_router.include_router(transactions.router)
api_router.include_router(dashboard.router)
api_router.include_router(groups.router)
api_router.include_router(group_expenses.router)
api_router.include_router(group_settlements.router)
api_router.include_router(ai.router)