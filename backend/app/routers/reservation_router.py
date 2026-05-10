
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.reservation_service import ReservationService
from app.repositories.reservation_repository import ReservationRepository
from app.dtos.reservation_dto import ReservationCreate, ReservationUpdate, ReservationResponse
from app.core.deps import get_current_user
from app.models import User
from app.repositories.parking_repository import ParkingRepository

router = APIRouter(prefix="/reservations", tags=["reservations"])


def get_reservation_service(db: AsyncSession = Depends(get_db)) -> ReservationService:
    repo = ReservationRepository(db)
    parking_repo = ParkingRepository(db)
    return ReservationService(repo, parking_repo)


@router.get("/", response_model=list[ReservationResponse])
async def get_all_reservations(
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_all_reservations()


@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    try:
        return await service.get_reservation_by_id(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/user/{user_id}", response_model=list[ReservationResponse])
async def get_reservations_by_user(
    user_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await service.get_reservations_by_user_id(user_id)


@router.get("/spot/{spot_id}", response_model=list[ReservationResponse])
async def get_reservations_by_spot(
    spot_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_reservations_by_spot_id(spot_id)


@router.post("/", response_model=ReservationResponse)
async def create_reservation(
    reservation: ReservationCreate,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != reservation.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return await service.create_reservation(
        reservation.user_id,
        reservation.spot_id
    )


@router.put("/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    reservation_id: int,
    updates: ReservationUpdate,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    try:
        return await service.update_reservation(reservation_id, **updates.dict(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{reservation_id}", response_model=ReservationResponse)
async def delete_reservation(
    reservation_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    try:
        return await service.delete_reservation(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
