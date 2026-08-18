FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install only PostgreSQL client library (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy service requirements
COPY requirements.txt .

# Install Python dependencies (psycopg2-binary doesn't need compilation)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY . /app

# Expose port
EXPOSE 8001

# Run the sensor API
CMD ["python", "main.py"]