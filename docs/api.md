# DisasterIntel API Specification

All backend endpoints are prefixed with `/api/v1` (and mirrored at `/api` for convenience).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, database connectivity, and version |
| `GET` | `/api/locations` | List of supported weather stations in Tamil Nadu & Puducherry |
| `GET` | `/api/weather/current` | Latest observed/blended surface weather for a specific station |
| `GET` | `/api/forecast` | Time-series forecast points (rainfall, temperature, wind, humidity, pressure) |
| `GET` | `/api/forecast/models` | Granular per-NWP forecasts (GFS, ECMWF, ICON, IMD) |
| `GET` | `/api/forecast/blended` | Blended predictions with confidence metrics and model metadata |
| `GET` | `/api/forecast/compare` | Synchronized multi-model comparison matrix vs actuals |
| `GET` | `/api/risk/map` | Location-level composite hazard indices for geospatial map rendering |
| `GET` | `/api/alerts` | Active and historical incident alerts with severity filtering |
| `GET` | `/api/metrics` | Model verification scorecard (MAE, RMSE, Bias, Skill Score) |
| `GET` | `/api/data-status` | Freshness and availability of Live, Historical, and Demo data feeds |
| `GET` | `/api/system/info` | Application version, uptime, backend, and ML model status |
