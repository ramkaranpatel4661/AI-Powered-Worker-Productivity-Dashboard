"""
Metrics computation service.

ASSUMPTIONS:
─────────────
1. TIME INTERVAL ASSUMPTION:
   Events are generated at regular intervals by the CV system.
   Each event represents the worker's state for a 5-minute window.
   The time between consecutive events for the same worker determines
   the duration of each state. If only one event exists, we assume
   a 5-minute default duration.

2. UTILIZATION CALCULATION:
   - Worker utilization = (active_time / (active_time + idle_time + absent_time)) * 100
   - Workstation utilization = (occupied_working_time / total_time_with_any_activity) * 100

3. PRODUCTION AGGREGATION:
   - product_count events have a 'count' field indicating units produced in that event.
   - Total units = sum of all 'count' values from product_count events.
   - Units per hour = total_units / (total_tracked_time_in_hours).
   - Throughput rate (workstation) = total_units / (total_occupancy_hours).

4. OUT-OF-ORDER EVENTS:
   Events are sorted by timestamp before computing durations.
   This handles out-of-order delivery gracefully.

5. DUPLICATE EVENTS:
   Handled at the database level via unique constraint on
   (timestamp, worker_id, workstation_id, event_type).
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from .models import AIEvent, Worker, Workstation
from .schemas import WorkerMetrics, WorkstationMetrics, FactoryMetrics

# Default time interval between events (minutes)
DEFAULT_EVENT_INTERVAL_MINUTES = 5.0


def _compute_durations(
    events: list,
) -> Tuple[float, float, float]:
    """
    Compute total working, idle, and absent durations from a sorted list of events.

    For consecutive events, the duration of each state is the time gap to the next event.
    For the last event, we assume the default interval.

    Returns: (working_minutes, idle_minutes, absent_minutes)
    """
    working_minutes = 0.0
    idle_minutes = 0.0
    absent_minutes = 0.0

    # Filter to only activity events (not product_count)
    activity_events = [e for e in events if e.event_type in ("working", "idle", "absent")]

    if not activity_events:
        return 0.0, 0.0, 0.0

    # Sort by timestamp
    activity_events.sort(key=lambda e: e.timestamp)

    for i, event in enumerate(activity_events):
        if i + 1 < len(activity_events):
            delta = (activity_events[i + 1].timestamp - event.timestamp).total_seconds() / 60.0
            # Cap individual interval at 30 minutes to handle gaps
            duration = min(delta, 30.0)
        else:
            duration = DEFAULT_EVENT_INTERVAL_MINUTES

        if event.event_type == "working":
            working_minutes += duration
        elif event.event_type == "idle":
            idle_minutes += duration
        elif event.event_type == "absent":
            absent_minutes += duration

    return working_minutes, idle_minutes, absent_minutes


def get_worker_metrics(
    db: Session,
    worker_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[WorkerMetrics]:
    """Compute metrics for one or all workers."""
    workers = db.query(Worker).all()
    if worker_id:
        workers = [w for w in workers if w.worker_id == worker_id]

    results = []
    for worker in workers:
        query = db.query(AIEvent).filter(AIEvent.worker_id == worker.worker_id)
        if start_date:
            query = query.filter(AIEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(AIEvent.timestamp <= end_date)

        events = query.order_by(AIEvent.timestamp).all()

        working_min, idle_min, absent_min = _compute_durations(events)
        total_time = working_min + idle_min + absent_min

        # Production metrics
        total_units = sum(e.count or 0 for e in events if e.event_type == "product_count")
        total_hours = total_time / 60.0 if total_time > 0 else 1.0
        units_per_hour = total_units / total_hours if total_hours > 0 else 0.0

        utilization = (working_min / total_time * 100) if total_time > 0 else 0.0

        results.append(WorkerMetrics(
            worker_id=worker.worker_id,
            worker_name=worker.name,
            total_active_minutes=round(working_min, 2),
            total_idle_minutes=round(idle_min, 2),
            total_absent_minutes=round(absent_min, 2),
            utilization_percentage=round(utilization, 2),
            total_units_produced=total_units,
            units_per_hour=round(units_per_hour, 2),
        ))

    return results


def get_workstation_metrics(
    db: Session,
    station_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[WorkstationMetrics]:
    """Compute metrics for one or all workstations."""
    stations = db.query(Workstation).all()
    if station_id:
        stations = [s for s in stations if s.station_id == station_id]

    results = []
    for station in stations:
        query = db.query(AIEvent).filter(AIEvent.workstation_id == station.station_id)
        if start_date:
            query = query.filter(AIEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(AIEvent.timestamp <= end_date)

        events = query.order_by(AIEvent.timestamp).all()

        working_min, idle_min, absent_min = _compute_durations(events)

        # Occupancy = time the station had a worker present (working + idle)
        occupancy_min = working_min + idle_min
        total_time = working_min + idle_min + absent_min

        utilization = (working_min / total_time * 100) if total_time > 0 else 0.0

        total_units = sum(e.count or 0 for e in events if e.event_type == "product_count")
        occupancy_hours = occupancy_min / 60.0 if occupancy_min > 0 else 1.0
        throughput = total_units / occupancy_hours if occupancy_hours > 0 else 0.0

        results.append(WorkstationMetrics(
            station_id=station.station_id,
            station_name=station.name,
            occupancy_minutes=round(occupancy_min, 2),
            utilization_percentage=round(utilization, 2),
            total_units_produced=total_units,
            throughput_rate=round(throughput, 2),
        ))

    return results


def get_factory_metrics(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> FactoryMetrics:
    """Compute factory-level aggregated metrics."""
    worker_metrics = get_worker_metrics(db, start_date=start_date, end_date=end_date)

    total_productive = sum(w.total_active_minutes for w in worker_metrics)
    total_production = sum(w.total_units_produced for w in worker_metrics)
    avg_utilization = (
        sum(w.utilization_percentage for w in worker_metrics) / len(worker_metrics)
        if worker_metrics else 0.0
    )
    avg_production_rate = (
        sum(w.units_per_hour for w in worker_metrics) / len(worker_metrics)
        if worker_metrics else 0.0
    )

    # Count total events
    event_query = db.query(func.count(AIEvent.id))
    if start_date:
        event_query = event_query.filter(AIEvent.timestamp >= start_date)
    if end_date:
        event_query = event_query.filter(AIEvent.timestamp <= end_date)
    total_events = event_query.scalar()

    return FactoryMetrics(
        total_productive_minutes=round(total_productive, 2),
        total_production_count=total_production,
        average_production_rate=round(avg_production_rate, 2),
        average_utilization=round(avg_utilization, 2),
        total_workers=db.query(Worker).count(),
        total_workstations=db.query(Workstation).count(),
        total_events=total_events,
    )
