FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install only PostgreSQL client library (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY requirements.backend.txt .

# Install Python dependencies (psycopg2-binary doesn't need compilation)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.backend.txt

# Copy backend code only
COPY ./app/backend /app/backend

# Expose port
EXPOSE 8001

# Run the backend application
CMD ["python", "backend/main.py"]