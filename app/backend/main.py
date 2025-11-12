import os
import time
import threading
import logging
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
from sqlalchemy import create_engine, Column, Integer, Float, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Configure logging with UTC+7 timezone
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
# Set logging to use local timezone (UTC+7)
logging.Formatter.converter = lambda *args: datetime.now(tz=timezone(timedelta(hours=7))).timetuple()
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@postgres:5432/data"
)

# Blynk API configuration
BLYNK_TOKEN = "doDoL-_pRrwBVtx2zXCEyFXLbMOcQQ5E"
BLYNK_API_URL = f"https://blynk.cloud/external/api/getAll?token={BLYNK_TOKEN}"

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Database model
class SensorData(Base):
    __tablename__ = "data"

    id = Column(Integer, primary_key=True, index=True)
    temperatureC = Column(Float, nullable=False)
    temperatureF = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    ppm_nh3 = Column(Integer, nullable=False)
    ppm_co2 = Column(Integer, nullable=False)
    ppm_c2h5oh = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# FastAPI app
app = FastAPI(title="Sensor Data Collection API", version="1.0.0")

# Background thread control
_stop_event = threading.Event()
_worker_thread = None


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_database():
    """Create tables if they don't exist"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database table 'data' verified/created")

        # Test connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise


def fetch_blynk_data() -> dict | None:
    """Fetch data from Blynk API"""
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(BLYNK_API_URL)
            response.raise_for_status()
            data = response.json()
            logger.debug(f"Fetched from Blynk: {data}")
            return data
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching Blynk data: {e}")
        return None
    except Exception as e:
        logger.error(f"Error fetching Blynk data: {e}")
        return None


def transform_blynk_data(blynk_data: dict) -> dict | None:
    """
    Transform Blynk data format to database format
    """
    if not blynk_data:
        return None

    try:
        return {
            "temperatureC": float(blynk_data.get("v0", 0.0)),
            "temperatureF": float(blynk_data.get("v1", 0.0)),
            "humidity": float(blynk_data.get("v2", 0.0)),
            "ppm_nh3": int(blynk_data.get("v3", 0)),
            "ppm_co2": int(blynk_data.get("v4", 0)),
            "ppm_c2h5oh": int(blynk_data.get("v5", 0)),
            "timestamp": datetime.utcnow() + timedelta(hours=7),
        }
    except (ValueError, TypeError) as e:
        logger.error(f"Error transforming data: {e}")
        return None


def save_to_database(data: dict) -> bool:
    """Save sensor data to PostgreSQL"""
    if not data:
        return False

    db = SessionLocal()
    try:
        record = SensorData(**data)
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info(
            f"Saved ID={record.id}: "
            f"Temp={data['temperatureC']:.1f}°C, "
            f"Humidity={data['humidity']:.1f}%, "
            f"CO2={data['ppm_co2']}ppm"
        )
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Database save error: {e}")
        return False
    finally:
        db.close()


def data_collection_loop():
    """Background thread that collects data every second"""
    logger.info("Background data collection started")

    while not _stop_event.is_set():
        start_time = time.time()

        try:
            # Fetch from Blynk API
            blynk_data = fetch_blynk_data()

            if blynk_data:
                # Transform data
                transformed_data = transform_blynk_data(blynk_data)

                # Save to database
                if transformed_data:
                    save_to_database(transformed_data)
            else:
                logger.warning("No data received from Blynk API")

        except Exception as e:
            logger.error(f"Error in collection loop: {e}")

        # Sleep to maintain ~1 second interval
        elapsed = time.time() - start_time
        sleep_duration = max(0.0, 1.0 - elapsed)
        time.sleep(sleep_duration)

    logger.info("Background data collection stopped")


@app.on_event("startup")
async def startup_event():
    """Initialize database and start background collection"""
    logger.info("=" * 50)
    logger.info("FastAPI Application Starting Up")
    logger.info("=" * 50)

    # Wait for PostgreSQL to be ready
    max_retries = 10
    for i in range(max_retries):
        try:
            init_database()
            break
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"Database not ready, retrying... ({i+1}/{max_retries})")
                time.sleep(2)
            else:
                logger.error("Failed to connect to database after multiple retries")
                raise

    # Start background collection thread
    global _worker_thread
    _stop_event.clear()
    _worker_thread = threading.Thread(target=data_collection_loop, daemon=True)
    _worker_thread.start()

    logger.info("Application startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Stop background collection thread"""
    logger.info("Shutting down application...")
    _stop_event.set()

    if _worker_thread:
        _worker_thread.join(timeout=5)

    logger.info("Application shutdown complete")


# API Endpoints
@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Sensor Data Collection API",
        "status": "running",
        "endpoints": {
            "/health": "Health check",
            "/latest": "Get latest sensor reading",
            "/stats": "Get statistics",
            "/data": "Get recent data (optional limit parameter)",
        },
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    db = SessionLocal()
    try:
        # Test database connection
        db.execute(text("SELECT 1"))

        # Get record count
        count = db.query(SensorData).count()

        return {
            "status": "healthy",
            "database": "connected",
            "total_records": count,
            "blynk_token": BLYNK_TOKEN[:10] + "..." if BLYNK_TOKEN else "not_set",
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e),
            },
        )
    finally:
        db.close()


@app.get("/latest")
def get_latest_reading():
    """Get the most recent sensor reading"""
    db = SessionLocal()
    try:
        latest = db.query(SensorData).order_by(SensorData.timestamp.desc()).first()

        if not latest:
            return {"message": "No data available yet"}

        return {
            "id": latest.id,
            "temperatureC": latest.temperatureC,
            "temperatureF": latest.temperatureF,
            "humidity": latest.humidity,
            "ppm_nh3": latest.ppm_nh3,
            "ppm_co2": latest.ppm_co2,
            "ppm_c2h5oh": latest.ppm_c2h5oh,
            "timestamp": latest.timestamp.isoformat(),
        }
    finally:
        db.close()


@app.get("/data")
def get_recent_data(limit: int = 10):
    """Get recent sensor readings"""
    if limit > 1000:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 1000")

    db = SessionLocal()
    try:
        records = (
            db.query(SensorData)
            .order_by(SensorData.timestamp.desc())
            .limit(limit)
            .all()
        )

        return {
            "count": len(records),
            "data": [
                {
                    "id": r.id,
                    "temperatureC": r.temperatureC,
                    "temperatureF": r.temperatureF,
                    "humidity": r.humidity,
                    "ppm_nh3": r.ppm_nh3,
                    "ppm_co2": r.ppm_co2,
                    "ppm_c2h5oh": r.ppm_c2h5oh,
                    "timestamp": r.timestamp.isoformat(),
                }
                for r in records
            ],
        }
    finally:
        db.close()


@app.get("/stats")
def get_statistics():
    """Get statistics about collected data"""
    db = SessionLocal()
    try:
        from sqlalchemy import func

        stats = db.query(
            func.count(SensorData.id).label("total_records"),
            func.avg(SensorData.temperatureC).label("avg_temp_c"),
            func.min(SensorData.temperatureC).label("min_temp_c"),
            func.max(SensorData.temperatureC).label("max_temp_c"),
            func.avg(SensorData.humidity).label("avg_humidity"),
            func.avg(SensorData.ppm_co2).label("avg_co2"),
            func.min(SensorData.timestamp).label("first_reading"),
            func.max(SensorData.timestamp).label("last_reading"),
        ).first()

        if not stats or stats.total_records == 0:
            return {"message": "No data available yet"}

        return {
            "total_records": stats.total_records,
            "temperature": {
                "average_celsius": (
                    round(float(stats.avg_temp_c), 2) if stats.avg_temp_c else None
                ),
                "min_celsius": (
                    round(float(stats.min_temp_c), 2) if stats.min_temp_c else None
                ),
                "max_celsius": (
                    round(float(stats.max_temp_c), 2) if stats.max_temp_c else None
                ),
            },
            "humidity": {
                "average_percent": (
                    round(float(stats.avg_humidity), 2) if stats.avg_humidity else None
                )
            },
            "co2": {
                "average_ppm": round(float(stats.avg_co2), 2) if stats.avg_co2 else None
            },
            "time_range": {
                "first_reading": (
                    stats.first_reading.isoformat() if stats.first_reading else None
                ),
                "last_reading": (
                    stats.last_reading.isoformat() if stats.last_reading else None
                ),
            },
        }
    finally:
        db.close()

@app.get("/predict")
async def predict_spoilage():
    """Predict spoilage based on recent sensor readings"""
    limit = 10
    ai_service_url = os.getenv("AI_SERVICE_URL", "http://lstm_api:8000")
    
    db = SessionLocal()
    try:
        # Fetch last 10 records from database
        records = (
            db.query(SensorData)
            .order_by(SensorData.timestamp.desc())
            .limit(limit)
            .all()
        )
        
        if len(records) < limit:
            return JSONResponse(
                status_code=400,
                content={
                    "error": f"Not enough data. Need {limit} records, found {len(records)}",
                    "message": "Please wait for more sensor data to be collected"
                }
            )
        
        # Reverse to get chronological order (oldest to newest)
        records = list(reversed(records))
        
        # Format data for AI service
        # Map database columns to sensor names expected by AI model
        payload = {
            "mq135_values": [float(r.ppm_co2) for r in records],      # MQ135 -> CO2
            "mq3_values": [float(r.ppm_c2h5oh) for r in records],     # MQ3 -> Ethanol
            "mics5524_values": [float(r.ppm_nh3) for r in records]    # MiCS5524 -> NH3
        }
        
        logger.info(f"Sending prediction request with {len(records)} data points")
        logger.debug(f"Payload: {payload}")
        
        # Send prediction request to AI service
        async with httpx.AsyncClient(timeout=30.0) as client:
            ai_response = await client.post(
                f"{ai_service_url}/predict",
                json=payload
            )
            ai_response.raise_for_status()
            prediction_result = ai_response.json()
        
        logger.info(f"AI Prediction: {prediction_result}")
        
        # Extract classification probability as integer (0-100)
        classification_prob = int(prediction_result.get("classification_prob", 0))
        classification_text = prediction_result.get("classification_text", "Unknown")
        confidence = prediction_result.get("confidence", 0.0)
        
        # Send result to Blynk virtual pin V7
        blynk_update_url = f"https://blynk.cloud/external/api/update?token={BLYNK_TOKEN}&v7={classification_prob}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            blynk_response = await client.get(blynk_update_url)
            blynk_response.raise_for_status()
        
        logger.info(f"Updated Blynk V7 with value: {classification_prob}")
        
        return {
            "status": "success",
            "prediction": {
                "classification": classification_text,
                "probability": classification_prob,
                "confidence": confidence,
                "raw_prediction": prediction_result
            },
            "blynk_updated": True,
            "blynk_pin": "V7",
            "blynk_value": classification_prob,
            "data_points_used": len(records),
            "sensor_data": {
                "mq135_co2": payload["mq135_values"],
                "mq3_ethanol": payload["mq3_values"],
                "mics5524_nh3": payload["mics5524_values"]
            }
        }
        
    except httpx.HTTPError as e:
        logger.error(f"HTTP error during prediction: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Failed to get prediction from AI service",
                "details": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Error during prediction: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error during prediction",
                "details": str(e)
            }
        )
    finally:
        db.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False, log_level="info")