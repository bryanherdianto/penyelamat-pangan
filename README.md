# QAI Hub Models Deployment

Docker-based deployment for Qualcomm AI Hub models with FastAPI, featuring the LSTM Food Freshness detection model.

## Prerequisites

- Docker Desktop for Windows
- Docker Compose
- Python 3.13 (for local development)

## Project Structure

```
Deployment/
├── app/
│   ├── ai/
│   │   ├── deploy.py           # Main deployment script with CLI
│   │   ├── inference.py        # Modular inference utilities
│   │   ├── example_usage.py    # Usage examples
│   │   └── references/         # Reference notebooks
│   └── main.py                 # FastAPI application
├── models/                     # Model storage directory
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Docker image configuration
├── requirements.txt            # Python dependencies
├── fetch-model.ps1            # Model download script (PowerShell)
├── fetch-model.py             # Model download script (Python)
├── test-api.ps1               # API testing script
└── load-test.ps1              # Load testing script
```

## Quick Start

### 1. Download the Model

First, fetch the LSTM Food Freshness model:

```powershell
# PowerShell
.\fetch-model.ps1

# Or using Python
python fetch-model.py
```

### 2. Run Inference (Local)

```powershell
# Basic inference with random data
python app\ai\deploy.py

# Test with fresh food simulation
python app\ai\deploy.py --test-type fresh

# Test with spoiled food simulation
python app\ai\deploy.py --test-type spoiled

# Run on Qualcomm NPU (if available)
python app\ai\deploy.py --use-npu

# Save results to directory
python app\ai\deploy.py --output-dir ./results --verbose
```

### 3. Run Examples

```powershell
python app\ai\example_usage.py
```

### 4. Using Docker Compose

```powershell
# Build and start
docker-compose up --build

# Access the API
# - API: http://localhost:8000
# - Docs: http://localhost:8000/docs

# Stop
docker-compose down
```

## LSTM Food Freshness Model

The model provides **dual outputs**:

1. **Binary Classification**: Fresh (1) vs Bad (0) food status
2. **RSL Regression**: Remaining Shelf Life in hours (0-168)

### Input Format

- **Sequence Length**: 10 timesteps
- **Features**: 3 sensors (MQ135, MQ3, MiCS5524)
- **Shape**: `(batch_size, 10, 3)`

### Using the Inference Module

```python
from app.ai.inference import ONNXFoodFreshnessInference, generate_test_data

# Initialize predictor
predictor = ONNXFoodFreshnessInference("models/lstm_food_freshness.onnx")

# Generate test data
fresh_data = generate_test_data("fresh", seed=42)

# Run prediction
result = predictor.predict(fresh_data)

print(f"Status: {result['classification_text']}")
print(f"Confidence: {result['confidence']:.2f}%")
print(f"RSL: {result['rsl_hours']:.1f} hours")
```

### Using Sensor Arrays

```python
# Provide 10 readings from each sensor
mq135 = [150, 152, 148, 155, 151, 153, 149, 154, 150, 152]
mq3 = [125, 127, 123, 128, 126, 129, 124, 127, 125, 128]
mics5524 = [180, 182, 178, 185, 181, 183, 179, 184, 180, 182]

result = predictor.predict_from_sensors(mq135, mq3, mics5524)
```

### Real-Time Buffer (for Arduino/IoT)

```python
from app.ai.inference import SensorBuffer

# Create buffer for rolling window
buffer = SensorBuffer(buffer_size=10)

# Add readings one by one (like in Arduino loop)
buffer.add_reading(mq135=150, mq3=125, mics5524=180)

# Check if ready to predict
if buffer.is_ready():
    sequence = buffer.get_sequence()
    result = predictor.predict(sequence)
```

## API Endpoints

- `GET /` - Root endpoint with API information
- `GET /health` - Health check
- `GET /models` - List available QAI Hub models
- `POST /predict` - Run model predictions

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `API_HOST` - API host (default: 0.0.0.0)
- `API_PORT` - API port (default: 8000)
- `QAI_HUB_API_TOKEN` - Your QAI Hub API token (if needed)
- `MODEL_CACHE_DIR` - Model cache directory

## Docker Commands

```powershell
# Build the image
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose stop

# Remove containers
docker-compose down

# Rebuild and start
docker-compose up --build
```

## Development

The application uses hot-reload in development mode. Changes to files in the `app` directory will automatically restart the server.

## License

MIT