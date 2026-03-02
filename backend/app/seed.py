"""
Seed data generator for pre-populating the database with meaningful dummy data.

Generates events across a full work day (8:00 AM - 5:00 PM) for 6 workers
across 6 workstations, simulating realistic factory activity patterns.
"""

import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Worker, Workstation, AIEvent

# ─── Seed Worker and Workstation Data ─────────────────────────────

WORKERS = [
    {"worker_id": "W1", "name": "Alice Johnson"},
    {"worker_id": "W2", "name": "Bob Smith"},
    {"worker_id": "W3", "name": "Charlie Davis"},
    {"worker_id": "W4", "name": "Diana Martinez"},
    {"worker_id": "W5", "name": "Edward Wilson"},
    {"worker_id": "W6", "name": "Fiona Brown"},
]

WORKSTATIONS = [
    {"station_id": "S1", "name": "Assembly Line A", "station_type": "assembly"},
    {"station_id": "S2", "name": "Assembly Line B", "station_type": "assembly"},
    {"station_id": "S3", "name": "Quality Control", "station_type": "inspection"},
    {"station_id": "S4", "name": "Packaging Unit", "station_type": "packaging"},
    {"station_id": "S5", "name": "Welding Station", "station_type": "welding"},
    {"station_id": "S6", "name": "CNC Machine Bay", "station_type": "machining"},
]

# Worker-to-primary-workstation assignment (workers rotate but have primaries)
WORKER_PRIMARY_STATION = {
    "W1": "S1", "W2": "S2", "W3": "S3",
    "W4": "S4", "W5": "S5", "W6": "S6",
}


def seed_workers_and_workstations(db: Session) -> None:
    """Insert workers and workstations if not already present."""
    for w_data in WORKERS:
        existing = db.query(Worker).filter(Worker.worker_id == w_data["worker_id"]).first()
        if not existing:
            db.add(Worker(**w_data))

    for s_data in WORKSTATIONS:
        existing = db.query(Workstation).filter(Workstation.station_id == s_data["station_id"]).first()
        if not existing:
            db.add(Workstation(**s_data))

    db.commit()


def generate_dummy_events(
    db: Session,
    date: datetime = None,
    clear_existing: bool = False,
) -> int:
    """
    Generate a full day of simulated factory events.

    Each worker gets events every 5 minutes during an 8-hour shift.
    The pattern simulates:
    - Morning productive period (8:00-12:00)
    - Lunch break (12:00-12:30) - absent
    - Afternoon productive period (12:30-17:00)
    - Random idle periods scattered throughout
    - product_count events during working periods

    Args:
        db: Database session
        date: The date to generate events for (defaults to 2026-01-15)
        clear_existing: If True, deletes all existing events before generating

    Returns:
        Number of events generated
    """
    if clear_existing:
        db.query(AIEvent).delete()
        db.commit()

    if date is None:
        date = datetime(2026, 1, 15)

    seed_workers_and_workstations(db)

    shift_start = date.replace(hour=8, minute=0, second=0, microsecond=0)
    shift_end = date.replace(hour=17, minute=0, second=0, microsecond=0)
    lunch_start = date.replace(hour=12, minute=0, second=0, microsecond=0)
    lunch_end = date.replace(hour=12, minute=30, second=0, microsecond=0)

    event_interval = timedelta(minutes=5)
    events_created = 0

    for worker_id, primary_station in WORKER_PRIMARY_STATION.items():
        current_time = shift_start
        current_station = primary_station

        # Each worker has slightly different productivity patterns
        worker_idx = int(worker_id[1:])
        base_productivity = 0.70 + (worker_idx * 0.03)  # 73% to 88%
        random.seed(worker_idx * 42 + date.day)  # Reproducible randomness

        while current_time < shift_end:
            # Determine event type based on time of day and randomness
            if lunch_start <= current_time < lunch_end:
                event_type = "absent"
                confidence = round(random.uniform(0.90, 0.99), 2)
            elif random.random() < base_productivity:
                event_type = "working"
                confidence = round(random.uniform(0.85, 0.98), 2)
            elif random.random() < 0.3:
                event_type = "absent"
                confidence = round(random.uniform(0.80, 0.95), 2)
            else:
                event_type = "idle"
                confidence = round(random.uniform(0.75, 0.95), 2)

            # Occasionally switch workstations (simulates rotation)
            if random.random() < 0.05:
                other_stations = [s["station_id"] for s in WORKSTATIONS if s["station_id"] != current_station]
                current_station = random.choice(other_stations)
            elif random.random() < 0.15:
                current_station = primary_station  # Return to primary

            # Create activity event
            try:
                event = AIEvent(
                    timestamp=current_time,
                    worker_id=worker_id,
                    workstation_id=current_station,
                    event_type=event_type,
                    confidence=confidence,
                    count=0,
                )
                db.add(event)
                db.flush()
                events_created += 1
            except Exception:
                db.rollback()

            # Generate product_count events during working periods
            if event_type == "working" and random.random() < 0.6:
                units = random.randint(1, 5)
                try:
                    prod_event = AIEvent(
                        timestamp=current_time + timedelta(seconds=30),  # Slight offset
                        worker_id=worker_id,
                        workstation_id=current_station,
                        event_type="product_count",
                        confidence=round(random.uniform(0.90, 0.99), 2),
                        count=units,
                    )
                    db.add(prod_event)
                    db.flush()
                    events_created += 1
                except Exception:
                    db.rollback()

            current_time += event_interval

    db.commit()
    return events_created


def generate_multi_day_events(db: Session, days: int = 5, clear_existing: bool = False) -> int:
    """Generate events across multiple days for richer metrics."""
    if clear_existing:
        db.query(AIEvent).delete()
        db.commit()

    total = 0
    base_date = datetime(2026, 1, 13)  # Start from Monday
    for day_offset in range(days):
        date = base_date + timedelta(days=day_offset)
        # Skip weekends
        if date.weekday() >= 5:
            continue
        count = generate_dummy_events(db, date=date, clear_existing=False)
        total += count

    return total
