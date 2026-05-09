# =============================================================================
# Backend Dockerfile - FastAPI Application
# =============================================================================
# Builds the Python backend with all dependencies.
# Uses start.sh to run Uvicorn server on port 8000.
# =============================================================================

# Use official Python image (slim for smaller size)
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy requirements first (for Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Copy and prepare startup script
COPY start.sh .
RUN chmod +x start.sh

# Run the startup script (starts Uvicorn)
CMD ["./start.sh"]
