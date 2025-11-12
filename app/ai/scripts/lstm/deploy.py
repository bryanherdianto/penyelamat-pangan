"""
LSTM Food Freshness Model Backend API

A simple backend API service that loads the LSTM Food Freshness model
and waits for prediction requests.

Endpoints:
  - GET  /health      : Health check
  - POST /predict     : Make predictions on sensor data
  - GET  /model/info  : Get model information
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
from pathlib import Path
import uvicorn

# Import inference utilities
from inference import ONNXFoodFreshnessInference, format_prediction_text

# Initialize FastAPI app
app = FastAPI(
    title="Food Freshness AI Backend",
    description="LSTM-based food freshness prediction API",
    version="1.0.0"
)

# Global model instance
model = None
MODEL_PATH = "app/ai/models/lstm/lstm_food_freshness.onnx"


class SensorData(BaseModel):
    """Sensor reading sequence for prediction"""
    mq135_values: List[float] = Field(..., description="MQ135 sensor readings (10 values)", min_items=10, max_items=10)
    mq3_values: List[float] = Field(..., description="MQ3 sensor readings (10 values)", min_items=10, max_items=10)
    mics5524_values: List[float] = Field(..., description="MiCS5524 sensor readings (10 values)", min_items=10, max_items=10)


class PredictionResponse(BaseModel):
    """Prediction result"""
    classification_text: str
    classification_prob: float
    confidence: float
    rsl_hours: float
    status: str


@app.on_event("startup")
async def load_model():
    """Load the ONNX model on startup and fit scaler"""
    global model
    
    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        print(f"⚠️  Warning: Model not found at {model_path}")
        print("    Run 'python fetch-model.py' to download the model")
        return
    
    try:
        print(f"🔄 Loading model from {model_path}...")
        # Initialize model with scaler fitting (downloads dataset and fits scaler)
        model = ONNXFoodFreshnessInference(str(model_path), fit_scaler=True)
        print("✓ Model loaded and ready for predictions!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Food Freshness AI Backend",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "model_info": "/model/info"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_loaded = model is not None
    return {
        "status": "healthy" if model_loaded else "model_not_loaded",
        "model_loaded": model_loaded
    }


@app.get("/model/info")
async def model_info():
    """Get model information"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_path": MODEL_PATH,
        "sequence_length": 10,
        "num_features": 3,
        "sensors": ["MQ135", "MQ3", "MiCS5524"],
        "outputs": ["classification", "remaining_shelf_life"]
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(data: SensorData):
    """
    Make a food freshness prediction based on sensor readings
    
    Args:
        data: Sensor data with 10 readings from each sensor
    
    Returns:
        Prediction result with classification and remaining shelf life
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs."
        )
    
    try:
        # Run prediction
        result = model.predict_from_sensors(
            data.mq135_values,
            data.mq3_values,
            data.mics5524_values
        )
        
        return PredictionResponse(
            classification_text=result["classification_text"],
            classification_prob=result["classification_prob"],
            confidence=result["confidence"],
            rsl_hours=result["rsl_hours"],
            status="success"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


def start_server(host: str = "0.0.0.0", port: int = 8000):
    """Start the API server"""
    print(f"\n{'='*70}")
    print("� Starting Food Freshness AI Backend")
    print(f"{'='*70}\n")
    
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()