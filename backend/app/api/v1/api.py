from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    locations,
    weather,
    forecast,
    risk,
    alerts,
    metrics,
    admin,
    system
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(system.router, tags=["System & Status"])
api_router.include_router(locations.router, prefix="/locations", tags=["Locations"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
api_router.include_router(forecast.router, prefix="/forecast", tags=["Forecast"])
api_router.include_router(risk.router, prefix="/risk", tags=["Disaster Risk"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Model Performance"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
