#!/bin/bash
# Start script to run both FastAPI backend and MQTT publisher

# Start FastAPI backend in background
echo "Starting FastAPI backend..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Wait a moment for services to initialize
echo "Waiting for services to initialize..."
sleep 5

# Start MQTT publisher in foreground (so container logs show MQTT activity)
echo "Starting MQTT mock publisher..."
python mqtt_mock_publisher.py

