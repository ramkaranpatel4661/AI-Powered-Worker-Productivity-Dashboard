"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


# ─── Event Schemas ───────────────────────────────────────────────

class EventCreate(BaseModel):
    """Schema for ingesting a single AI event."""
    timestamp: datetime
    worker_id: str
    workstation_id: str
    event_type: str = Field(..., pattern="^(working|idle|absent|product_count)$")
    confidence: float = Field(..., ge=0.0, le=1.0)
    count: Optional[int] = Field(default=0, ge=0)

    @validator("count", pre=True, always=True)
    def set_default_count(cls, v, values):
        if values.get("event_type") == "product_count" and (v is None or v == 0):
            return v  # Allow 0 for product_count
        return v or 0


class EventBatchCreate(BaseModel):
    """Schema for ingesting a batch of AI events."""
    events: List[EventCreate]


class EventResponse(BaseModel):
    """Schema for returning an AI event."""
    id: int
    timestamp: datetime
    worker_id: str
    workstation_id: str
    event_type: str
    confidence: float
    count: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Worker Schemas ──────────────────────────────────────────────

class WorkerBase(BaseModel):
    worker_id: str
    name: str


class WorkerResponse(WorkerBase):
    class Config:
        from_attributes = True


class WorkerMetrics(BaseModel):
    """Computed metrics for a single worker."""
    worker_id: str
    worker_name: str
    total_active_minutes: float
    total_idle_minutes: float
    total_absent_minutes: float
    utilization_percentage: float
    total_units_produced: int
    units_per_hour: float


# ─── Workstation Schemas ─────────────────────────────────────────

class WorkstationBase(BaseModel):
    station_id: str
    name: str
    station_type: Optional[str] = None


class WorkstationResponse(WorkstationBase):
    class Config:
        from_attributes = True


class WorkstationMetrics(BaseModel):
    """Computed metrics for a single workstation."""
    station_id: str
    station_name: str
    occupancy_minutes: float
    utilization_percentage: float
    total_units_produced: int
    throughput_rate: float  # units per hour


# ─── Factory Schemas ─────────────────────────────────────────────

class FactoryMetrics(BaseModel):
    """Factory-level aggregated metrics."""
    total_productive_minutes: float
    total_production_count: int
    average_production_rate: float  # units per hour across all workers
    average_utilization: float  # average utilization % across all workers
    total_workers: int
    total_workstations: int
    total_events: int


# ─── Filter Schemas ──────────────────────────────────────────────

class MetricsFilter(BaseModel):
    """Optional date range filter for metrics."""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    worker_id: Optional[str] = None
    workstation_id: Optional[str] = None
