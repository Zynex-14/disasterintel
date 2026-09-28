from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Location
from app.schemas.weather import CurrentWeatherOut
from app.services.location_service import LocationService
from app.services.weather_service import WeatherService

router = APIRouter()

@router.get("/current", response_model=CurrentWeatherOut)
async def get_current_weather(
    location_id: int = Query(default=1, description="District ID"),
    db: Session = Depends(get_db)
):
    """
    Get current weather for the specified district.
    Uses Open-Meteo live API when available, falling back smoothly to simulated demo mode.
    """
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        # Fall back to first location
        locs = LocationService.get_locations(db)
        if not locs:
            raise HTTPException(status_code=404, detail="No locations configured")
        loc = locs[0]

    return await WeatherService.get_current_weather(loc, db)

from app.services.radar_service import RadarNowcastService
from typing import Optional

@router.get("/radar/sites")
def get_radar_sites():
    """Retrieve Doppler Weather Radar stations in Tamil Nadu (Chennai Port, Karaikal)."""
    return {"sites": RadarNowcastService.get_radar_sites()}

@router.get("/radar/nowcast")
def get_radar_nowcast(scenario: Optional[str] = Query(default=None)):
    """Retrieve 0-3h Doppler radar nowcast frames with reflectivity cells in dBZ."""
    scen = scenario or WeatherService.active_scenario
    return RadarNowcastService.generate_nowcast_frames(scenario=scen)

@router.get("/spatial-mesh")
def get_spatial_grid_mesh(scenario: Optional[str] = Query(default=None)):
    """Retrieve 2D continuous spatial grid surface across Tamil Nadu for GIS contour rendering."""
    scen = scenario or WeatherService.active_scenario
    return RadarNowcastService.generate_spatial_grid_mesh(scenario=scen)
