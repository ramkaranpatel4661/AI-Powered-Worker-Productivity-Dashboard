"""
API route definitions for event ingestion, metrics, and data management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from datetime import datetime

from .database import get_db
from .models import AIEvent, Worker, Workstation
from .schemas import (
    EventCreate, EventBatchCreate, EventResponse,
    WorkerResponse, WorkerMetrics,
    WorkstationResponse, WorkstationMetrics,
    FactoryMetrics,
)
from .metrics import get_worker_metrics, get_workstation_metrics, get_factory_metrics
from .seed import seed_workers_and_workstations, generate_multi_day_events, generate_dummy_events

router = APIRouter()


# ─── Health Check ────────────────────────────────────────────────

@router.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ─── Event Ingestion ─────────────────────────────────────────────

@router.post("/events", response_model=EventResponse, status_code=201)
def ingest_event(event: EventCreate, db: Session = Depends(get_db)):
    """
    Ingest a single AI event from the CCTV system.

    Handles:
    - Duplicate events: Returns 409 Conflict if event already exists
    - Validation: Pydantic validates event_type, confidence range, etc.
    - Out-of-order: Events are stored with their original timestamp;
      metrics computation sorts by timestamp when calculating durations.
    """
    # Validate worker exists
    worker = db.query(Worker).filter(Worker.worker_id == event.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker {event.worker_id} not found")

    # Validate workstation exists
    station = db.query(Workstation).filter(Workstation.station_id == event.workstation_id).first()
    if not station:
        raise HTTPException(status_code=404, detail=f"Workstation {event.workstation_id} not found")

    db_event = AIEvent(
        timestamp=event.timestamp,
        worker_id=event.worker_id,
        workstation_id=event.workstation_id,
        event_type=event.event_type,
        confidence=event.confidence,
        count=event.count or 0,
    )

    try:
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Duplicate event: an event with the same timestamp, worker, workstation, and type already exists."
        )


@router.post("/events/batch", status_code=201)
def ingest_event_batch(batch: EventBatchCreate, db: Session = Depends(get_db)):
    """
    Ingest a batch of AI events.

    Returns a summary of how many events were successfully ingested
    vs duplicates/errors. This supports intermittent connectivity
    where edge devices may resend events.
    """
    created = 0
    duplicates = 0
    errors = []

    for event in batch.events:
        db_event = AIEvent(
            timestamp=event.timestamp,
            worker_id=event.worker_id,
            workstation_id=event.workstation_id,
            event_type=event.event_type,
            confidence=event.confidence,
            count=event.count or 0,
        )
        try:
            db.add(db_event)
            db.flush()
            created += 1
        except IntegrityError:
            db.rollback()
            duplicates += 1
        except Exception as e:
            db.rollback()
            errors.append(str(e))

    db.commit()
    return {
        "total_received": len(batch.events),
        "created": created,
        "duplicates": duplicates,
        "errors": len(errors),
        "error_details": errors[:10],
    }


@router.get("/events", response_model=List[EventResponse])
def list_events(
    worker_id: Optional[str] = None,
    workstation_id: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """List events with optional filters and pagination."""
    query = db.query(AIEvent)

    if worker_id:
        query = query.filter(AIEvent.worker_id == worker_id)
    if workstation_id:
        query = query.filter(AIEvent.workstation_id == workstation_id)
    if event_type:
        query = query.filter(AIEvent.event_type == event_type)
    if start_date:
        query = query.filter(AIEvent.timestamp >= start_date)
    if end_date:
        query = query.filter(AIEvent.timestamp <= end_date)

    return query.order_by(AIEvent.timestamp.desc()).offset(offset).limit(limit).all()


# ─── Workers ─────────────────────────────────────────────────────

@router.get("/workers", response_model=List[WorkerResponse])
def list_workers(db: Session = Depends(get_db)):
    """List all workers."""
    return db.query(Worker).all()


# ─── Workstations ────────────────────────────────────────────────

@router.get("/workstations", response_model=List[WorkstationResponse])
def list_workstations(db: Session = Depends(get_db)):
    """List all workstations."""
    return db.query(Workstation).all()


# ─── Metrics ─────────────────────────────────────────────────────

@router.get("/metrics/workers", response_model=List[WorkerMetrics])
def worker_metrics(
    worker_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """Get productivity metrics for workers."""
    return get_worker_metrics(db, worker_id=worker_id, start_date=start_date, end_date=end_date)


@router.get("/metrics/workstations", response_model=List[WorkstationMetrics])
def workstation_metrics(
    station_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """Get productivity metrics for workstations."""
    return get_workstation_metrics(db, station_id=station_id, start_date=start_date, end_date=end_date)


@router.get("/metrics/factory", response_model=FactoryMetrics)
def factory_metrics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
):
    """Get factory-level aggregated metrics."""
    return get_factory_metrics(db, start_date=start_date, end_date=end_date)


# ─── Data Management (for evaluators) ───────────────────────────

@router.post("/seed", status_code=200)
def seed_data(
    days: int = Query(default=5, ge=1, le=30),
    clear: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    """
    Seed or refresh dummy data via API.

    Evaluators can call this endpoint to:
    - Add fresh dummy data (POST /api/seed)
    - Clear and regenerate (POST /api/seed?clear=true)
    - Control number of days (POST /api/seed?days=10)
    """
    seed_workers_and_workstations(db)
    count = generate_multi_day_events(db, days=days, clear_existing=clear)
    return {
        "message": f"Generated {count} events across {days} workdays",
        "events_created": count,
        "cleared_existing": clear,
    }


@router.delete("/events/all", status_code=200)
def clear_all_events(db: Session = Depends(get_db)):
    """Delete all events (for testing/reset purposes)."""
    count = db.query(AIEvent).count()
    db.query(AIEvent).delete()
    db.commit()
    return {"message": f"Deleted {count} events"}
