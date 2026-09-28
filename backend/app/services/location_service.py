from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.models import Location
from app.schemas.location import LocationCreate

DEFAULT_LOCATIONS = [
    {"name": "Chennai", "state": "Tamil Nadu", "latitude": 13.0827, "longitude": 80.2707, "elevation_m": 6.0},
    {"name": "Coimbatore", "state": "Tamil Nadu", "latitude": 11.0168, "longitude": 76.9558, "elevation_m": 411.0},
    {"name": "Madurai", "state": "Tamil Nadu", "latitude": 9.9252, "longitude": 78.1198, "elevation_m": 136.0},
    {"name": "Tiruchirappalli", "state": "Tamil Nadu", "latitude": 10.7905, "longitude": 78.7047, "elevation_m": 88.0},
    {"name": "Salem", "state": "Tamil Nadu", "latitude": 11.6643, "longitude": 78.1460, "elevation_m": 278.0},
    {"name": "Cuddalore", "state": "Tamil Nadu", "latitude": 11.7480, "longitude": 79.7714, "elevation_m": 1.0},
    {"name": "Nagapattinam", "state": "Tamil Nadu", "latitude": 10.7656, "longitude": 79.8424, "elevation_m": 9.0},
    {"name": "Kanyakumari", "state": "Tamil Nadu", "latitude": 8.0883, "longitude": 77.5385, "elevation_m": 30.0},
    {"name": "Vellore", "state": "Tamil Nadu", "latitude": 12.9165, "longitude": 79.1325, "elevation_m": 216.0},
    {"name": "Thanjavur", "state": "Tamil Nadu", "latitude": 10.7870, "longitude": 79.1378, "elevation_m": 57.0},
    {"name": "Nilgiris (Ooty)", "state": "Tamil Nadu", "latitude": 11.4102, "longitude": 76.6950, "elevation_m": 2240.0},
    {"name": "Puducherry", "state": "Puducherry", "latitude": 11.9416, "longitude": 79.8083, "elevation_m": 3.0},
]

class LocationService:
    @staticmethod
    def seed_default_locations(db: Session) -> List[Location]:
        """Seed default Tamil Nadu and Puducherry districts if not present."""
        existing_count = db.query(Location).count()
        if existing_count == 0:
            locations = [Location(**loc) for loc in DEFAULT_LOCATIONS]
            db.add_all(locations)
            db.commit()
            return db.query(Location).all()
        return db.query(Location).all()

    @staticmethod
    def get_locations(db: Session) -> List[Location]:
        locs = db.query(Location).order_by(Location.name.asc()).all()
        if not locs:
            return LocationService.seed_default_locations(db)
        return locs

    @staticmethod
    def get_location_by_id(db: Session, location_id: int) -> Optional[Location]:
        return db.query(Location).filter(Location.id == location_id).first()

    @staticmethod
    def get_location_by_name(db: Session, name: str) -> Optional[Location]:
        return db.query(Location).filter(Location.name.ilike(f"%{name}%")).first()

    @staticmethod
    def create_location(db: Session, loc: LocationCreate) -> Location:
        db_loc = Location(**loc.model_dump())
        db.add(db_loc)
        db.commit()
        db.refresh(db_loc)
        return db_loc
