
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app import models
from app.routers.user_router import router as user_router
from app.routers.parking_router import router as parking_router
from app.routers.spot_status_log_router import router as spot_status_log_router
from app.routers.reservation_router import router as reservation_router
from app.mqtt_consumer import start_mqtt_consumer, add_websocket_client, remove_websocket_client
from app.database import get_session, redis_client
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Database initialized")

    session = await get_session()
    try:
        from app.repositories.parking_repository import ParkingRepository
        repo = ParkingRepository(session)
        await repo.preload_spots_to_cache()
        logger.info("Redis cache preload successful")
    except Exception as e:
        logger.error(f"Failed to preload Redis cache: {e}")
    finally:
        await session.close()

    try:
        await start_mqtt_consumer()
        logger.info("MQTT consumer started successfully")
    except Exception as e:
        logger.error(f"Failed to start MQTT consumer: {e}")

    yield

    logger.info("Shutting down...")


app = FastAPI(lifespan=lifespan, title="Smart Parking API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    add_websocket_client(websocket)
    logger.info(f"WebSocket client connected: {websocket.client}")

    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "echo", "message": data})

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {websocket.client}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        remove_websocket_client(websocket)


app.include_router(user_router, prefix="/api")
app.include_router(parking_router, prefix="/api")
app.include_router(spot_status_log_router, prefix="/api")
app.include_router(reservation_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Smart Parking Backend Running!"}
