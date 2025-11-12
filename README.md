# Food Freshness Deployment

Docker-based deployment for **PenyelamatPangan** (Food Savior) - An AI-powered food freshness monitoring system using LSTM neural networks and IoT sensors.

## 📦 What's Inside

This repository contains Docker configurations for:

- **🤖 AI Service (LSTM)** - Food freshness prediction using LSTM neural network
- **🔌 Backend API** - Sensor data collection and prediction endpoint  
- **🗄️ PostgreSQL** - Time-series sensor data storage
- **🦙 Ollama LLM** - Falcon3:1b model for natural language processing

## 🚀 Quick Start

### Step 1: Start Docker Services

```powershell
# Navigate to project directory
cd C:\Users\ryana\Deployment

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Step 2: Verify Services

```powershell
# Test backend
Invoke-RestMethod -Uri "http://localhost:8001/health"

# Test AI service  
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

## 📡 API Endpoints

### Backend API - Port 8001

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET | `/` | Root endpoint info | `http://localhost:8001/` |
| GET | `/health` | Health check | `http://localhost:8001/health` |
| GET | `/stats` | Data statistics | `http://localhost:8001/stats` |
| GET | `/latest` | Latest sensor reading | `http://localhost:8001/latest` |
| GET | `/data?limit=10` | Get recent data | `http://localhost:8001/data?limit=50` |
| POST | `/data/insert` | Insert test data | See below |
| GET | `/predict` | Predict freshness | `http://localhost:8001/predict` |

### AI Service - Port 8000

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root endpoint |
| GET | `/health` | Model health status |
| GET | `/model/info` | Model configuration |
| POST | `/predict` | Make prediction |

### Ollama LLM - Port 11434

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | List available models |
| POST | `/api/generate` | Generate text with Falcon3:1b |

## 💻 Example API Calls

### Get Latest Sensor Data

```powershell
Invoke-RestMethod -Uri "http://localhost:8001/latest"
```

### Get Multiple Readings

```powershell
# Get last 50 records
Invoke-RestMethod -Uri "http://localhost:8001/data?limit=50"
```

### Predict Food Freshness

```powershell
# Automatically uses last 10 readings from database
Invoke-RestMethod -Uri "http://localhost:8001/predict"
```

### Direct AI Prediction

```powershell
$body = @{
    mq135_values = @(151.0, 148.0, 155.0, 142.0, 159.0, 147.0, 153.0, 145.0, 156.0, 149.0)
    mq3_values = @(127.0, 123.0, 131.0, 129.0, 125.0, 133.0, 122.0, 128.0, 130.0, 126.0)
    mics5524_values = @(182.0, 178.0, 186.0, 180.0, 184.0, 179.0, 187.0, 181.0, 183.0, 185.0)
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/predict" -Method Post -Body $body -ContentType "application/json"
```

### Ollama Text Generation

```powershell
$body = @{
    model = "falcon3:1b"
    prompt = "Say 'Hello from Falcon3!' in one sentence."
    stream = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
```

## 🔧 Docker Commands

### Basic Operations

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart service
docker-compose restart backend_api

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f backend_api
```

### Database Access

```powershell
# Connect to PostgreSQL
docker exec -it postgres_db psql -U user -d data

# Quick query
docker exec postgres_db psql -U user -d data -c "SELECT COUNT(*) FROM data;"
```

## 🧪 Testing Scripts

```powershell
# Test all services
python test-docker.py

# Test prediction pipeline with real data
python test-prediction-pipeline.py

# Populate database with test data
python populate-database.py
```

## 🌐 Service URLs

| Service | URL | Documentation |
|---------|-----|---------------|
| Backend API | http://localhost:8001 | http://localhost:8001/docs |
| AI Service | http://localhost:8000 | http://localhost:8000/docs |
| Ollama | http://localhost:11434 | - |
| PostgreSQL | localhost:5432 | - |

## 📁 Project Structure

```
Deployment/
├── app/
│   ├── ai/                  # AI LSTM Service
│   │   ├── Dockerfile
│   │   ├── models/lstm/     # ONNX model
│   │   └── scripts/lstm/    # Inference scripts
│   └── backend/             # Backend API
│       ├── Dockerfile  
│       └── main.py          # FastAPI app
├── docker-compose.yml       # Service orchestration
├── requirements.txt         # AI dependencies
└── requirements.backend.txt # Backend dependencies
```

## 🤝 Contributing

Part of the **PenyelamatPangan** (Food Savior) project.

---

**Status**: 🚀 Active Development