# DisasterIntel — Hybrid AI-NWP Multi-Model Forecast Blending System

> **Disaster Management & Meteorological Decision Support Platform**  
> Operational multi-model numerical weather prediction (NWP) assimilation, machine learning forecast blending, and transparent experimental hazard classification for Tamil Nadu & Puducherry, India.

---

## 🛰️ Project Overview

**DisasterIntel** is an end-to-end full-stack platform designed to improve regional rainfall forecasting and disaster preparedness. By combining multi-source Numerical Weather Prediction (NWP) models (NOAA GFS, ECMWF IFS, DWD ICON, and IMD UM) through performance-weighted and machine-learning blenders (Random Forest & Ridge Regression), DisasterIntel minimizes systematic regional biases and provides actionable, explainable hazard intelligence.

### Key Capabilities
- **Multi-Source Ingestion & Harmonization:** Ingests forecasts from global and regional NWP sources with strict temporal alignment.
- **Physics-Bounded Blending:** Guarantees non-negative precipitation predictions ($\max(0, \hat{y})$) and conservation bounds.
- **Baseline vs. ML Comparison:** Benchmarks arithmetic equal-weight ensemble averaging against learned ML stacking models.
- **Standardized Verification Scorecard:** Rigorously calculates MAE, RMSE, Mean Bias, and Skill Scores over chronologically separated validation sets.
- **Explainable Hazard Classification:** Transparent risk categorization for Heavy Rainfall (IMD classification), High Wind (Squall/Gale), Extreme Temperature, and Composite Flood Indicators.
- **Deduplicated Alert Dispatch:** Incident alerting system with deterministic deduplication keys preventing warning storms.
- **Interactive Control Room:** High-density dark navy dashboard featuring dual-axis meteorology charts, Leaflet GIS map with hazard layers, and telemetry panels.

---

## 🏛️ System Architecture

```text
disasterintel/
├── frontend/             # React 19 + Vite + Tailwind CSS + Leaflet + Recharts
│   ├── public/           # Static assets, icons, manifest
│   └── src/
│       ├── app/          # Core application container & routing
│       ├── components/   # Modular UI components (layout, dashboard, charts, maps, alerts)
│       ├── pages/        # 8 distinct views (Overview, Forecast, Comparison, Blending, Map, Alerts, Metrics, About)
│       ├── services/     # Typed API clients & error handlers
│       ├── hooks/        # Custom React hooks
│       ├── types/        # TypeScript / schema definitions
│       └── utils/        # Formatting, risk formulas, math helpers
├── backend/              # Python 3.12 + FastAPI + SQLAlchemy + Pydantic v2
│   ├── app/
│   │   ├── api/v1/       # REST API route handlers
│   │   ├── core/         # Settings, logging, CORS, constants
│   │   ├── db/           # SQLAlchemy engine, session, declarative models
│   │   ├── schemas/      # Pydantic v2 request/response contracts
│   │   ├── services/     # Ingestion, preprocessing, blending, evaluation, risk engine
│   │   └── main.py       # ASGI application entrypoint
│   ├── tests/            # Pytest test suite (API, ML, Risk engines)
│   └── requirements.txt  # Python package specifications
├── data/                 # Data directory
│   ├── raw/              # Raw ingested NWP responses
│   ├── processed/        # Harmonized spatio-temporal datasets
│   └── sample/           # Offline demo datasets
├── ml/                   # Machine learning pipeline
│   ├── notebooks/        # Exploratory analysis & verification notebooks
│   ├── training/         # Model training routines (Ridge, Random Forest)
│   ├── evaluation/       # Skill scoring & cross-validation
│   └── artifacts/        # Serialized models (.joblib) & metadata JSON
├── docs/                 # System documentation
│   ├── architecture.md   # Architectural design document
│   ├── api.md            # OpenAPI specification & endpoint contracts
│   ├── data-sources.md   # NWP source details & parameter mapping
│   └── evaluation.md     # Verification metrics & evaluation methodology
├── scripts/              # Setup, database seeding & model training scripts
├── .env.example          # Environment configuration template
├── .gitignore            # Git exclusion rules
├── docker-compose.yml    # Multi-container deployment specification
└── README.md             # Project documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 18+ and `npm`

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migration & seed synthetic/historical station data
python ../scripts/seed_database.py

# Run backend test suite
pytest

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```

FastAPI Swagger Documentation will be accessible at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Dashboard will be accessible at: `http://localhost:5173`

---

## 📊 Core Pages & Capabilities

1. **Dashboard Overview**: Primary control room matching the dark navy design reference (`#06162F`), featuring compact weather cards, Overall Risk Level gauge, dual-axis 24h/3D/7D forecast charts, AI blended forecast card, 4-panel disaster risk overview, recent alerts table, model comparison chart, data status panel, Leaflet regional map, and system info widget.
2. **Weather Forecast**: Detailed time-series forecasts across rainfall, temperature, wind speed, relative humidity, and barometric pressure.
3. **Multi-Model Comparison**: Interactive multi-line comparison of GFS, ECMWF, ICON, and IMD NWP vs. blended models and ground-truth observations.
4. **AI Forecast Blending**: Explainable ML interface showing individual NWP weights, learned feature contributions, physics bounding, and inter-model spread metrics.
5. **Disaster Risk Map**: Geospatial GIS viewer with CartoDB dark tiles, animated severity markers, hazard filtering, and district-level vulnerability drilldowns across Tamil Nadu and Puducherry.
6. **Alerts Center**: Comprehensive operational alerts log with severity filtering, hazard type filters, and deduplication controls.
7. **Model Performance**: Meteorological verification scorecard reporting MAE, RMSE, Mean Bias, Pearson Correlation, and Skill Scores.
8. **About Project**: Architectural details, scientific methodology, data source acknowledgments, and statutory disclaimers.

---

## ⚠️ Statutory Warning & Transparency Notice

DisasterIntel is an experimental decision-support and research platform. All risk ratings, composite hazard indices, and blended outputs are generated algorithmically for evaluation purposes and do **not** replace official weather warnings issued by the **India Meteorological Department (IMD)** or national disaster management authorities.
