# AI-Powered Worker Productivity Dashboard

A full-stack web application that ingests AI-generated CCTV events from a manufacturing factory and displays real-time worker productivity metrics.

<div align="center">

### 🌐 [**Live Demo**](https://ai-powered-worker-productivity-dashboard-qdw5.onrender.com/)

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Dashboard-blue?style=for-the-badge&logoColor=white)](https://ai-powered-worker-productivity-dashboard-qdw5.onrender.com/)
[![Status](https://img.shields.io/website?url=https%3A%2F%2Fai-powered-worker-productivity-dashboard-qdw5.onrender.com&style=for-the-badge&label=Status)](https://ai-powered-worker-productivity-dashboard-qdw5.onrender.com/)

</div>

> **Note:** The app is hosted on Render's free tier. The first request may take ~30 seconds if the instance has spun down due to inactivity.

**Tech Stack:** FastAPI (Python) · SQLite · React · Tailwind CSS · Recharts · Docker

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Metric Definitions](#metric-definitions)
6. [Assumptions & Tradeoffs](#assumptions--tradeoffs)
7. [Handling Edge Cases](#handling-edge-cases)
8. [Scaling Strategy](#scaling-strategy)
9. [Model Versioning, Drift & Retraining](#model-versioning-drift--retraining)
10. [Project Structure](#project-structure)

---

## Architecture Overview

```
┌──────────────────┐     JSON Events     ┌──────────────────┐     SQL     ┌───────────┐
│  AI/CV Cameras   │ ──────────────────► │  FastAPI Backend  │ ──────────► │  SQLite   │
│  (Edge Devices)  │   POST /api/events  │  (Python 3.11)   │  SQLAlchemy │  Database │
└──────────────────┘                     └────────┬─────────┘             └───────────┘
                                                  │
                                           REST API (JSON)
                                                  │
                                         ┌────────▼─────────┐
                                         │  React Dashboard  │
                                         │  (Vite + Tailwind)│
                                         └──────────────────┘
```

### Data Flow

1. **Edge → Backend:** AI-powered CCTV cameras run computer vision models locally and output structured JSON events (worker activity state every ~5 minutes). These events are sent via `POST /api/events` or `POST /api/events/batch` to the backend.

2. **Backend → Database:** FastAPI validates incoming events using Pydantic schemas, deduplicates via a unique constraint `(timestamp, worker_id, workstation_id, event_type)`, and persists them in SQLite using SQLAlchemy ORM.

3. **Backend → Dashboard:** The React frontend calls REST endpoints (`/api/metrics/*`) to fetch pre-computed productivity metrics. The backend aggregates events on-demand, sorting by timestamp to handle out-of-order delivery.

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd "Technical Assessment Full-Stack ML Ops Engineer @ Biz-Tech Analytics"

# Build and run with Docker Compose
docker-compose up --build

# Access the dashboard
open http://localhost:8000
```

### Option 2: Local Development

**Prerequisites:** Python 3.11+, Node.js 18+

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# 2. Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

- **Backend API:** http://localhost:8000/api/docs (Swagger UI)
- **Frontend Dev:** http://localhost:3000 (proxies to backend)

### Seeding / Refreshing Data

The database is automatically pre-populated with 5 days of realistic factory events on first run. To refresh data via API:

```bash
# Generate fresh data (5 days)
curl -X POST http://localhost:8000/api/seed?days=5

# Clear and regenerate
curl -X POST "http://localhost:8000/api/seed?days=5&clear=true"

# Clear all events
curl -X DELETE http://localhost:8000/api/events/all
```

These endpoints allow evaluators to add or refresh data **without editing the database or frontend code**.

---

## Database Schema

```sql
-- Workers table
CREATE TABLE workers (
    worker_id   TEXT PRIMARY KEY,   -- e.g., "W1"
    name        TEXT NOT NULL       -- e.g., "Alice Johnson"
);

-- Workstations table
CREATE TABLE workstations (
    station_id    TEXT PRIMARY KEY,  -- e.g., "S1"
    name          TEXT NOT NULL,     -- e.g., "Assembly Line A"
    station_type  TEXT               -- e.g., "assembly", "inspection"
);

-- AI Events table
CREATE TABLE ai_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       DATETIME NOT NULL,
    worker_id       TEXT NOT NULL REFERENCES workers(worker_id),
    workstation_id  TEXT NOT NULL REFERENCES workstations(station_id),
    event_type      TEXT NOT NULL,       -- 'working', 'idle', 'absent', 'product_count'
    confidence      REAL NOT NULL,       -- 0.0 to 1.0
    count           INTEGER DEFAULT 0,   -- Units produced (for product_count events)

    -- Deduplication constraint
    UNIQUE(timestamp, worker_id, workstation_id, event_type)
);

-- Indexes for query performance
CREATE INDEX ix_ai_events_timestamp ON ai_events(timestamp);
CREATE INDEX ix_ai_events_worker_id ON ai_events(worker_id);
CREATE INDEX ix_ai_events_workstation_id ON ai_events(workstation_id);
CREATE INDEX ix_ai_events_event_type ON ai_events(event_type);
```

### Entity Relationships

- Each **Worker** has many **AIEvents**
- Each **Workstation** has many **AIEvents**
- Workers are assigned to a primary workstation but may rotate

### Sample Data

| Workers | Workstations |
|---------|-------------|
| W1 - Alice Johnson | S1 - Assembly Line A (assembly) |
| W2 - Bob Smith | S2 - Assembly Line B (assembly) |
| W3 - Charlie Davis | S3 - Quality Control (inspection) |
| W4 - Diana Martinez | S4 - Packaging Unit (packaging) |
| W5 - Edward Wilson | S5 - Welding Station (welding) |
| W6 - Fiona Brown | S6 - CNC Machine Bay (machining) |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Ingest a single AI event |
| `POST` | `/api/events/batch` | Ingest a batch of events |
| `GET` | `/api/events` | List events (filterable by worker, station, type, date range) |
| `GET` | `/api/metrics/factory` | Factory-level aggregated metrics |
| `GET` | `/api/metrics/workers` | Worker metrics (optional `?worker_id=W1`) |
| `GET` | `/api/metrics/workstations` | Workstation metrics (optional `?station_id=S1`) |
| `GET` | `/api/workers` | List all workers |
| `GET` | `/api/workstations` | List all workstations |
| `POST` | `/api/seed` | Seed/refresh dummy data (`?days=5&clear=true`) |
| `DELETE` | `/api/events/all` | Delete all events |
| `GET` | `/api/health` | Health check |

### Event Payload

```json
{
  "timestamp": "2026-01-15T10:15:00Z",
  "worker_id": "W1",
  "workstation_id": "S3",
  "event_type": "working",
  "confidence": 0.93,
  "count": 1
}
```

### Batch Ingestion Response

```json
{
  "total_received": 100,
  "created": 95,
  "duplicates": 5,
  "errors": 0,
  "error_details": []
}
```

---

## Metric Definitions

### Worker-Level Metrics

| Metric | Definition |
|--------|-----------|
| **Total Active Time** | Sum of durations where `event_type = "working"` |
| **Total Idle Time** | Sum of durations where `event_type = "idle"` |
| **Utilization %** | `(active_time / (active_time + idle_time + absent_time)) × 100` |
| **Total Units Produced** | Sum of `count` from all `product_count` events |
| **Units per Hour** | `total_units / (total_tracked_time_in_hours)` |

### Workstation-Level Metrics

| Metric | Definition |
|--------|-----------|
| **Occupancy Time** | Duration a workstation had workers present (working + idle events) |
| **Utilization %** | `(working_time / (working_time + idle_time + absent_time)) × 100` |
| **Total Units Produced** | Sum of `count` from all `product_count` events at this station |
| **Throughput Rate** | `total_units / occupancy_hours` (units per hour) |

### Factory-Level Metrics

| Metric | Definition |
|--------|-----------|
| **Total Productive Time** | Sum of active time across all workers |
| **Total Production Count** | Sum of all units produced |
| **Avg Production Rate** | Average of per-worker units/hour |
| **Avg Utilization** | Average of per-worker utilization percentages |

### How Durations Are Computed

Events are sorted chronologically per worker. The duration of each event state is determined by the time gap to the **next** event:

```
Event(10:00, working) → Event(10:05, working) → duration = 5 min
Event(10:05, working) → Event(10:10, idle)    → duration = 5 min
Event(10:10, idle)    → Event(10:15, working) → duration = 5 min
Event(10:15, working) → [last event]          → duration = 5 min (default)
```

- **Gap cap:** Individual intervals are capped at 30 minutes to handle data gaps (e.g., network outages)
- **Last event:** Uses a default 5-minute interval

### How Production Events Relate to Activity Events

`product_count` events are **separate** from activity events (`working`, `idle`, `absent`). They typically occur during `working` periods and have a slight timestamp offset (30 seconds). The `count` field represents units produced in that event window. Production events are excluded from time-based calculations — they are purely additive counters aggregated by `SUM(count)`.

---

## Assumptions & Tradeoffs

1. **5-minute event intervals:** The CV system generates state snapshots every 5 minutes. This is configurable via `DEFAULT_EVENT_INTERVAL_MINUTES`.

2. **SQLite for simplicity:** Chosen for zero-config deployment and portability. For production, PostgreSQL or TimescaleDB would be preferred for concurrent writes and time-series optimization.

3. **On-demand metrics:** Metrics are computed on each API call rather than pre-aggregated. This trades latency for simplicity and freshness. For scale, a materialized view or caching layer (Redis) would be added.

4. **Single-day shift assumption:** Workers operate 8:00-17:00 with a 12:00-12:30 lunch break. Multi-shift would require shift definitions.

5. **Confidence threshold:** All events are accepted regardless of confidence. In production, low-confidence events (< 0.5) might be flagged or discarded.

6. **Worker-workstation assignment:** Workers have a primary station but can rotate. The seed data simulates ~5% rotation probability.

---

## Handling Edge Cases

### 1. Intermittent Connectivity

**Problem:** Edge devices (cameras) may lose network connectivity and resend events when reconnected.

**Solution:**
- **Batch ingestion endpoint** (`POST /api/events/batch`): Edge devices buffer events locally and send in batches when connectivity is restored.
- **Idempotent ingestion:** The unique constraint on `(timestamp, worker_id, workstation_id, event_type)` ensures duplicate events are silently rejected. The batch endpoint returns a summary of created vs. duplicate counts.
- **At-least-once delivery:** Edge devices can safely retry sending events without risk of double-counting.

**Production enhancement:** Add a message queue (RabbitMQ/Kafka) between edge devices and the backend. Edge devices publish events to a local queue that syncs when connectivity is available. The backend consumes from the queue with exactly-once semantics.

### 2. Duplicate Events

**Problem:** Network retries, multiple camera angles, or system glitches may produce duplicate events.

**Solution:**
- **Database-level dedup:** A `UNIQUE(timestamp, worker_id, workstation_id, event_type)` constraint prevents storage of exact duplicates.
- **Batch response transparency:** The batch endpoint clearly reports how many events were created vs. rejected as duplicates.
- **Graceful handling:** Duplicate attempts return HTTP 409 (single) or are counted in batch summary — they don't cause errors.

### 3. Out-of-Order Timestamps

**Problem:** Events may arrive out of chronological order due to network delays or multi-camera processing.

**Solution:**
- **Store first, sort later:** Events are persisted with their original timestamp immediately upon arrival.
- **Sort during computation:** Metrics computation sorts events chronologically per worker before calculating durations. This ensures correct state transitions regardless of arrival order.
- **No real-time streaming dependency:** The system doesn't rely on event ordering for correctness.

---

## Scaling Strategy

### 5 Cameras → 100+ Cameras → Multi-Site

#### Current Architecture (5 cameras, 6 workers)
- SQLite database, single FastAPI instance
- ~2,000 events/day → ~730K events/year
- On-demand metric computation

#### 100+ Cameras (single site)

| Component | Change |
|-----------|--------|
| **Database** | Migrate to PostgreSQL or TimescaleDB for concurrent writes and time-series queries |
| **Event Ingestion** | Add Apache Kafka or RabbitMQ as an event buffer. Cameras publish to topics; workers consume and persist |
| **Backend** | Run multiple FastAPI workers behind nginx/Traefik. Use Gunicorn with Uvicorn workers |
| **Metrics** | Pre-compute metrics via periodic background jobs (Celery/APScheduler). Cache in Redis |
| **API** | Add pagination, rate limiting, and API keys for camera authentication |
| **Storage** | Partition events table by date. Archive old events to cold storage (S3/MinIO) |

#### Multi-Site Deployment

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Factory A   │   │  Factory B   │   │  Factory C   │
│  Cameras     │   │  Cameras     │   │  Cameras     │
│  Edge Buffer │   │  Edge Buffer │   │  Edge Buffer │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       ▼                  ▼                   ▼
┌──────────────────────────────────────────────────┐
│              Central Kafka Cluster                │
│         (Event Streaming & Routing)               │
└─────────────────────┬────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Ingestion    │ │ Metrics  │ │ Dashboard    │
│ Service      │ │ Service  │ │ (React)      │
│ (Write Path) │ │ (Read)   │ │ Site Selector│
└──────┬───────┘ └──────┬───┘ └──────────────┘
       ▼                ▼
┌──────────────────────────┐
│ PostgreSQL / TimescaleDB  │
│ (Partitioned by site+date)│
└──────────────────────────┘
```

**Key changes for multi-site:**
- **Site isolation:** Each factory has its own edge buffer and Kafka topic
- **Central aggregation:** A shared Kafka cluster routes events to a central database
- **Multi-tenant dashboard:** Site selector in the UI; metrics API accepts `?site_id=` parameter
- **Data partitioning:** Partition DB tables by `(site_id, date)` for query performance
- **Edge resilience:** Local SQLite at each site ensures cameras continue operating during WAN outages

---

## Model Versioning, Drift & Retraining

### 1. Model Versioning

**Approach:** Add a `model_version` field to each event.

```json
{
  "timestamp": "2026-01-15T10:15:00Z",
  "worker_id": "W1",
  "event_type": "working",
  "confidence": 0.93,
  "model_version": "v2.3.1"
}
```

**Implementation:**
- **Model Registry:** Use MLflow, DVC, or a custom registry to track model versions, training data, hyperparameters, and performance metrics.
- **Side-by-side deployment:** Run multiple model versions simultaneously (A/B testing). Tag events with the model version that generated them.
- **Rollback capability:** If a new model degrades accuracy, roll back by redeploying the previous version to edge devices.
- **Schema evolution:** The `model_version` field enables filtering metrics by model version, comparing model performance across versions.

### 2. Detecting Model Drift

**Types of drift:**
- **Data drift:** Input data distribution changes (e.g., new lighting conditions, camera angles, worker clothing).
- **Concept drift:** The relationship between inputs and outputs changes (e.g., new workstation layouts).
- **Prediction drift:** Model output distribution shifts (e.g., confidence scores trend lower).

**Detection methods:**

| Method | What It Detects | How |
|--------|----------------|-----|
| **Confidence monitoring** | Prediction drift | Track rolling average of confidence scores. Alert if mean confidence drops below threshold |
| **Distribution comparison** | Data drift | Compare feature distributions (PSI, KL divergence) between training data and recent inference data |
| **Label drift** | Concept drift | Compare predicted label distribution (working/idle/absent ratios) over time windows |
| **Performance monitoring** | All types | Periodically sample events, get human labels, compute accuracy. Alert on degradation |

**Practical implementation:**
```python
# Pseudo-code for drift detection
recent_confidences = get_confidences(last_24h)
baseline_confidences = get_confidences(training_period)

if mean(recent_confidences) < 0.7:  # Absolute threshold
    alert("Low confidence detected")

psi = population_stability_index(baseline_confidences, recent_confidences)
if psi > 0.2:  # Significant shift
    alert("Prediction drift detected")
```

### 3. Triggering Retraining

**Trigger conditions (any of):**
- Confidence scores below threshold for >24 hours
- PSI (Population Stability Index) > 0.2
- Manual human audit reveals accuracy < 85%
- Scheduled periodic retraining (e.g., monthly)
- New camera/environment added

**Retraining pipeline:**

```
┌──────────┐    ┌──────────────┐    ┌───────────┐    ┌──────────┐
│ Trigger  │───►│ Collect Data │───►│ Train     │───►│ Evaluate │
│ Alert    │    │ + Labels     │    │ New Model │    │ A/B Test │
└──────────┘    └──────────────┘    └───────────┘    └──────┬───┘
                                                           │
                                                    ┌──────▼───┐
                                                    │  Deploy   │
                                                    │  to Edge  │
                                                    └──────────┘
```

**Best practices:**
- **Automated pipeline:** Use Kubeflow, Airflow, or similar to orchestrate retraining
- **Shadow deployment:** Run new model alongside old model before switching
- **Canary rollout:** Deploy to 1 camera first, verify metrics, then roll out to all
- **Data versioning:** Use DVC to version training datasets alongside model versions
- **Feedback loop:** Use dashboard analytics (e.g., events with confidence < 0.5) to identify samples for human labeling

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Package init
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models.py            # ORM models (Worker, Workstation, AIEvent)
│   │   ├── schemas.py           # Pydantic validation schemas
│   │   ├── routes.py            # API endpoint definitions
│   │   ├── metrics.py           # Metrics computation logic
│   │   └── seed.py              # Dummy data generation
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Main app component with routing
│   │   ├── api.js               # API client functions
│   │   ├── index.css            # Tailwind CSS imports
│   │   └── components/
│   │       ├── FactorySummary.jsx    # Factory-level KPIs and charts
│   │       ├── WorkerTable.jsx       # Sortable/filterable worker table
│   │       ├── WorkerDetail.jsx      # Individual worker drill-down
│   │       ├── WorkstationTable.jsx  # Workstation cards grid
│   │       ├── WorkstationDetail.jsx # Individual workstation drill-down
│   │       └── DataControls.jsx      # Seed/reset data controls
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── Dockerfile                   # Multi-stage build
├── docker-compose.yml           # Container orchestration
├── .dockerignore
├── .gitignore
└── README.md                    # This file
```

---

## License

This project was created as a technical assessment for Biz-Tech Analytics.
