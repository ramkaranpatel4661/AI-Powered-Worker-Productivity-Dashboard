"""
SQLAlchemy ORM models for Workers, Workstations, and AI Events.
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class Worker(Base):
    """Represents a factory worker."""
    __tablename__ = "workers"

    worker_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)

    events = relationship("AIEvent", back_populates="worker")

    def __repr__(self):
        return f"<Worker(worker_id={self.worker_id}, name={self.name})>"


class Workstation(Base):
    """Represents a factory workstation."""
    __tablename__ = "workstations"

    station_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    station_type = Column(String, nullable=True)

    events = relationship("AIEvent", back_populates="workstation")

    def __repr__(self):
        return f"<Workstation(station_id={self.station_id}, name={self.name})>"


class AIEvent(Base):
    """
    Represents an AI-generated event from the CCTV computer vision system.

    Deduplication: A unique constraint on (timestamp, worker_id, workstation_id, event_type)
    prevents duplicate events from being stored.
    """
    __tablename__ = "ai_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    worker_id = Column(String, ForeignKey("workers.worker_id"), nullable=False, index=True)
    workstation_id = Column(String, ForeignKey("workstations.station_id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)  # working, idle, absent, product_count
    confidence = Column(Float, nullable=False)
    count = Column(Integer, nullable=True, default=0)  # Units produced (for product_count events)

    worker = relationship("Worker", back_populates="events")
    workstation = relationship("Workstation", back_populates="events")

    # Unique constraint for deduplication of events
    __table_args__ = (
        UniqueConstraint(
            "timestamp", "worker_id", "workstation_id", "event_type",
            name="uq_event_dedup"
        ),
    )

    def __repr__(self):
        return (
            f"<AIEvent(id={self.id}, timestamp={self.timestamp}, "
            f"worker_id={self.worker_id}, event_type={self.event_type})>"
        )
