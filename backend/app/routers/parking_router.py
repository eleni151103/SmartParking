
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.repositories.parking_repository import ParkingRepository
from app.services.parking_service import ParkingService
from app.dtos.parking_dto import (
    ParkingSpotCreate,
    ParkingSpotUpdate,
    ParkingSpotResponse,
    ViewportResponse,
    LocationsResponse,
    SearchResult,
)
from app.core.deps import get_current_user, get_current_admin_user, get_optional_current_user
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parking", tags=["parking"])


def get_parking_service(db: AsyncSession = Depends(get_db)) -> ParkingService:
    return ParkingService(ParkingRepository(db))


@router.get("/spots/in_viewport", response_model=ViewportResponse)
async def get_spots_viewport(
    sw_lat: float = Query(..., alias="swLat", description="Southwest latitude"),
    sw_lng: float = Query(..., alias="swLng", description="Southwest longitude"),
    ne_lat: float = Query(..., alias="neLat", description="Northeast latitude"),
    ne_lng: float = Query(..., alias="neLng", description="Northeast longitude"),
    zoom: Optional[int] = Query(None, description="Map zoom level"),
    status: Optional[str] = Query(None, description="Optional status filter"),
    limit: int = Query(100, gt=0, le=500),
    service: ParkingService = Depends(get_parking_service),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    logger.info(f"Getting spots in viewport: {sw_lat}, {sw_lng}, {ne_lat}, {ne_lng}")

    spots = await service.get_spots_in_viewport(sw_lat, sw_lng, ne_lat, ne_lng, status, limit)

    dtos = [ParkingSpotResponse(
        id=s.id,
        latitude=s.latitude,
        longitude=s.longitude,
        location=s.location,
        status=s.status,
        price_per_hour=s.price_per_hour,
        city=s.city,
        area=s.area,
        last_updated=s.last_updated.isoformat() if s.last_updated else None
    ) for s in spots]

    return ViewportResponse(spots=dtos, total=len(dtos))


@router.get("/spots", response_model=list[ParkingSpotResponse])
async def get_all_spots(
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    spots = await service.get_all_spots()
    return [ParkingSpotResponse(
        id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
        status=s.status, last_updated=s.last_updated.isoformat() if s.last_updated else None,
        city=s.city, area=s.area,
        price_per_hour=float(s.price_per_hour) if s.price_per_hour is not None else None,
    ) for s in spots]


@router.get("/spots/{spot_id}", response_model=ParkingSpotResponse)
async def get_spot(
    spot_id: int,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    try:
        s = await service.get_spot_by_id(spot_id)
        return ParkingSpotResponse(
            id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
            status=s.status, last_updated=s.last_updated.isoformat() if s.last_updated else None
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/spots", response_model=ParkingSpotResponse)
async def create_spot(
    spot: ParkingSpotCreate,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_admin_user)
):
    s = await service.create_spot(spot.dict())
    return ParkingSpotResponse(
        id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
        status=s.status, last_updated=s.last_updated, price_per_hour=s.price_per_hour,
        city=s.city, area=s.area
    )


@router.put("/spots/{spot_id}", response_model=ParkingSpotResponse)
async def update_spot(
    spot_id: int,
    updates: ParkingSpotUpdate,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        s = await service.update_spot(spot_id, **updates.dict(exclude_unset=True))
        return ParkingSpotResponse(
            id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
            status=s.status, last_updated=s.last_updated, price_per_hour=s.price_per_hour,
            city=s.city, area=s.area
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/spots/{spot_id}", status_code=204)
async def delete_spot(
    spot_id: int,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        await service.delete_spot(spot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/locations", response_model=LocationsResponse)
async def get_locations(
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    try:
        cities, areas = await service.get_distinct_locations()
        return LocationsResponse(cities=cities, areas=areas)
    except Exception as e:
        logger.error(f"Failed to get locations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search", response_model=SearchResult)
async def search_spots(
    city: str = Query(..., description="City to search in"),
    area: Optional[str] = Query(None, description="Area to search in (optional)"),
    is_free: Optional[bool] = Query(None, description="Filter for free spots"),
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    try:
        spot_id, lat, lng = await service.search_spots(city, area, is_free)
        return SearchResult(id=spot_id, latitude=lat, longitude=lng)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Search failed for {city}/{area}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
