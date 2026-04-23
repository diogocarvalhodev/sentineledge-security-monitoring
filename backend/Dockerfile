# SentinelEdge Backend - FastAPI + AI Engine
FROM python:3.11-slim

LABEL maintainer="SentinelEdge Team"
LABEL description="SentinelEdge Backend - Local Security Monitoring with AI"

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    g++ \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /app/app

# Install YOLOv8n model (6MB auto-download)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" || echo "YOLOv8n will download on first run"

# Create uploads directory
RUN mkdir -p /app/uploads/alerts/thumbnails /app/uploads/system

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
