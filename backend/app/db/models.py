from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

def utcnow():
    return datetime.now(timezone.utc)

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    state = Column(String(100), nullable=False, default="Tamil Nadu")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, nullable=True, default=10.0)
    created_at = Column(DateTime, default=utcnow)

    forecasts = relationship("Forecast", back_populates="location", cascade="all, delete-orphan")
    blended_forecasts = relationship("BlendedForecast", back_populates="location", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="location", cascade="all, delete-orphan")


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    source = Column(String(50), nullable=False, index=True)  # e.g., GFS, ECMWF, IMD_NWP, ICON
    issued_at = Column(DateTime, nullable=False, index=True)
    valid_at = Column(DateTime, nullable=False, index=True)
    forecast_lead_hours = Column(Integer, nullable=False, default=0)
    
    # Weather variables normalized
    temperature = Column(Float, nullable=False)      # Celsius
    rainfall = Column(Float, nullable=False)         # mm
    humidity = Column(Float, nullable=False)         # %
    wind_speed = Column(Float, nullable=False)       # km/h
    pressure = Column(Float, nullable=False)         # hPa
    wind_direction = Column(Float, nullable=True)    # degrees
    precipitation_prob = Column(Float, nullable=True, default=0.0) # %
    
    data_status = Column(String(50), nullable=False, default="simulated_demo") # live, historical, simulated_demo
    created_at = Column(DateTime, default=utcnow)

    location = relationship("Location", back_populates="forecasts")

    __table_args__ = (
        Index("idx_forecast_loc_valid_source", "location_id", "valid_at", "source"),
    )


class BlendedForecast(Base):
    __tablename__ = "blended_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    valid_at = Column(DateTime, nullable=False, index=True)
    variable = Column(String(50), nullable=False, index=True) # rainfall, temperature, wind_speed
    blended_value = Column(Float, nullable=False)
    method = Column(String(50), nullable=False) # equal_weight, linear_regression, random_forest_regressor
    model_version = Column(String(50), nullable=False, default="v1.0.0")
    confidence_metadata = Column(Text, nullable=True) # JSON string of model weights/metrics
    created_at = Column(DateTime, default=utcnow)

    location = relationship("Location", back_populates="blended_forecasts")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    hazard_type = Column(String(50), nullable=False) # heavy_rainfall, flood_condition, high_wind, extreme_heat
    severity = Column(String(20), nullable=False)    # low, moderate, high, very_high
    description = Column(Text, nullable=False)
    triggering_value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    status = Column(String(20), nullable=False, default="active") # active, resolved
    is_simulated = Column(Boolean, nullable=False, default=True)
    deduplication_key = Column(String(150), unique=True, index=True)
    created_at = Column(DateTime, default=utcnow)

    location = relationship("Location", back_populates="alerts")


class EvaluationMetric(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(50), nullable=False, index=True) # GFS, ECMWF, IMD_NWP, ICON, Equal_Weight, AI_Random_Forest
    variable = Column(String(50), nullable=False, index=True)   # rainfall, temperature, wind_speed
    evaluation_period = Column(String(100), nullable=False)
    mae = Column(Float, nullable=False)
    rmse = Column(Float, nullable=False)
    bias = Column(Float, nullable=False)
    sample_count = Column(Integer, nullable=False)
    correlation = Column(Float, nullable=True, default=0.0)
    skill_score = Column(Float, nullable=True, default=0.0)
    created_at = Column(DateTime, default=utcnow)
