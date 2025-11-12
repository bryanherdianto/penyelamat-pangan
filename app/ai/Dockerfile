FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libglib2.0-0 \
    libgomp1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies (excluding onnxruntime-qnn)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    grep -v "onnxruntime" requirements.txt > requirements_temp.txt && \
    pip install --no-cache-dir -r requirements_temp.txt && \
    rm requirements_temp.txt

# Install ONNX Runtime QNN from wheel file
# OPTION 1: Place .whl file in app/ai/ and uncomment the line below:
# COPY onnxruntime_qnn-*.whl /tmp/onnxruntime_qnn.whl
# RUN pip install --no-cache-dir /tmp/onnxruntime_qnn.whl && rm /tmp/onnxruntime_qnn.whl

# OPTION 2: Install standard onnxruntime as fallback (uncomment if no wheel provided):
# RUN pip install --no-cache-dir onnxruntime>=1.16.0

# Copy application code
COPY ./app/ai /app

# Create models directory
RUN mkdir -p /app/models/lstm

# Expose API port
EXPOSE 8000

# Set Python path to include current directory
ENV PYTHONPATH=/app:/app/scripts/lstm

# Start the deploy.py script
CMD ["python", "scripts/lstm/deploy.py"]
