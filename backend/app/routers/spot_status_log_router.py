"""
spot_status_log_router.py - Status Log API Endpoints

Provides REST endpoints for:
- Tracking historical status changes for parking spots
- Used for analytics and debugging sensor data
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.spot_status_log_service import SpotStatusLogService
from app.repositories.spot_status_log_repository import SpotStatusLogRepository
from app.dtos.parking_dto import SpotStatusLogCreate, SpotStatusLogResponse

router = APIRouter(prefix="/spot-logs", tags=["spot-logs"])

def get_spot_status_log_service(db: AsyncSession = Depends(get_db)) -> SpotStatusLogService:
    repo = SpotStatusLogRepository(db)
    return SpotStatusLogService(repo)

@router.get("/", response_model=list[SpotStatusLogResponse])
async def get_all_logs(service: SpotStatusLogService = Depends(get_spot_status_log_service)):
    return await service.get_all_logs()

@router.get("/{log_id}", response_model=SpotStatusLogResponse)
async def get_log(log_id: int, service: SpotStatusLogService = Depends(get_spot_status_log_service)):
    try:
        return await service.get_log_by_id(log_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/spot/{spot_id}", response_model=list[SpotStatusLogResponse])
async def get_logs_by_spot(spot_id: int, service: SpotStatusLogService = Depends(get_spot_status_log_service)):
    return await service.get_logs_by_spot_id(spot_id)

@router.post("/", response_model=SpotStatusLogResponse)
async def create_log(log: SpotStatusLogCreate, service: SpotStatusLogService = Depends(get_spot_status_log_service)):
    return await service.create_log(log.spot_id, log.status)

@router.delete("/{log_id}", response_model=SpotStatusLogResponse)
async def delete_log(log_id: int, service: SpotStatusLogService = Depends(get_spot_status_log_service)):
    try:
        return await service.delete_log(log_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
