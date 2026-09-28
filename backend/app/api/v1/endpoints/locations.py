from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.location import LocationOut, LocationCreate
from app.services.location_service import LocationService

router = APIRouter()

@router.get("", response_model=List[LocationOut])
def get_locations(db: Session = Depends(get_db)):
    """Retrieve all supported observation & forecasting districts."""
    return LocationService.get_locations(db)

@router.get("/{location_id}", response_model=LocationOut)
def get_location(location_id: int, db: Session = Depends(get_db)):
    """Get location details by ID."""
    loc = LocationService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc

@router.post("", response_model=LocationOut)
def create_location(loc_in: LocationCreate, db: Session = Depends(get_db)):
    """Add a new custom geographical location."""
    return LocationService.create_location(db, loc_in)
