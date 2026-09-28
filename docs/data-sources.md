# DisasterIntel Meteorological Data Sources

## 1. Primary Numerical Weather Prediction (NWP) Models

| Model | Operating Agency | Resolution | Lead Time | Known Regional Bias in Tamil Nadu |
| :--- | :--- | :--- | :--- | :--- |
| **GFS** | NOAA (USA) | ~13 km | Up to 16 days | Tends to underestimate coastal convective rainfall peaks during Northeast Monsoon by 15-20% |
| **ECMWF IFS**| ECMWF (Europe) | ~9 km | Up to 10 days | Strong synoptic tracking skill, occasional dry bias in inland rain shadow regions |
| **ICON** | DWD (Germany) | ~13 km | Up to 7 days | High orographic precipitation over-forecasting in Western Ghats / Nilgiris |
| **IMD UM** | NCMRWF / IMD (India) | ~12 km | Up to 72 hours | High regional accuracy for surface temperature, localized squall boundary displacement |

## 2. Harmonized Parameter Schema
- `rainfall`: Accumulated liquid precipitation equivalent (mm)
- `temperature`: 2-meter air temperature (°C)
- `wind_speed`: 10-meter wind velocity (km/h)
- `relative_humidity`: Surface relative humidity (%)
- `surface_pressure`: Mean sea level pressure (hPa)
