"""
FastAPI application entry point.

Initializes the database, seeds data, and mounts API routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

from .database import engine, Base, SessionLocal
from .models import Worker, Workstation, AIEvent
from .seed import seed_workers_and_workstations, generate_multi_day_events
from .routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Worker Productivity Dashboard",
    description="Backend API for ingesting AI-generated CCTV events and computing worker productivity metrics.",
    version="1.0.0",
)

# CORS - allow frontend dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(router, prefix="/api")


@app.on_event("startup")
def startup_event():
    """Initialize database tables and seed data on first run."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if data already exists
        worker_count = db.query(Worker).count()
        if worker_count == 0:
            logger.info("Seeding workers and workstations...")
            seed_workers_and_workstations(db)
            logger.info("Generating dummy events for 5 work days...")
            count = generate_multi_day_events(db, days=5, clear_existing=False)
            logger.info(f"Generated {count} events.")
        else:
            logger.info(f"Database already has {worker_count} workers. Skipping seed.")
    finally:
        db.close()


# Serve frontend static files in production
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the React frontend for any non-API route."""
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
