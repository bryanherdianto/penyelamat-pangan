# Quick Setup Instructions

## To use with ONNX Runtime QNN wheel file:

### Step 1: Place your wheel file
```powershell
# Copy your wheel to app/ai/
Copy-Item "C:\path\to\onnxruntime_qnn-1.16.0-cp311-cp311-linux_x86_64.whl" "app\ai\"
```

### Step 2: Edit app/ai/Dockerfile
Uncomment these lines (around line 23-24):
```dockerfile
COPY onnxruntime_qnn-*.whl /tmp/onnxruntime_qnn.whl
RUN pip install --no-cache-dir /tmp/onnxruntime_qnn.whl && rm /tmp/onnxruntime_qnn.whl
```

### Step 3: Build and run
```powershell
docker-compose build lstm_api
docker-compose up
```

## To use standard onnxruntime (without QNN):

### Edit app/ai/Dockerfile
Uncomment this line (around line 27):
```dockerfile
RUN pip install --no-cache-dir onnxruntime>=1.16.0
```

Then build:
```powershell
docker-compose build lstm_api
docker-compose up
```

## Current State
Currently, the Dockerfile has BOTH options commented out. You must choose one option and uncomment it before building.
