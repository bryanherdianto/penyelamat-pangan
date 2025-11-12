# QAI Hub Models Deployment

Docker-based deployment for Qualcomm AI Hub models with FastAPI.

## Prerequisites

- Docker Desktop for Windows
- Docker Compose
- Python 3.13 (for local development)

## Project Structure

```
Deployment/
├── app/
│   └── main.py              # FastAPI application
├── models/                   # Model storage directory
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile               # Docker image configuration
├── requirements.txt         # Python dependencies
├── .dockerignore           # Docker ignore patterns
└── .env.example            # Environment variables template
```

## Getting Started

### Option 1: Using Docker Compose (Recommended)

1. **Build and start the containers:**
   ```powershell
   docker-compose up --build
   ```

2. **Access the API:**
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

3. **Stop the containers:**
   ```powershell
   docker-compose down
   ```

### Option 2: Local Development

1. **Install dependencies:**
   ```powershell
   python -m pip install -r requirements.txt
   ```

2. **Run the application:**
   ```powershell
   cd app
   python -m uvicorn main:app --reload
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