
from app.repositories.reservation_repository import ReservationRepository
from app.repositories.parking_repository import ParkingRepository
from datetime import datetime, timedelta
from typing import Optional
import asyncio


class ReservationService:

    def __init__(self, repo: ReservationRepository, parking_repo: ParkingRepository):
        self.repo = repo
        self.parking_repo = parking_repo

    async def get_all_reservations(self):
        return await self.repo.get_all_reservations()

    async def get_reservation_by_id(self, reservation_id: int):
        reservation = await self.repo.get_reservation_by_id(reservation_id)
        if not reservation:
            raise ValueError("Reservation not found")
        return reservation

    async def get_reservations_by_user_id(self, user_id: int):
        return await self.repo.get_reservations_by_user_id(user_id)

    async def get_reservations_by_spot_id(self, spot_id: int):
        return await self.repo.get_reservations_by_spot_id(spot_id)

    async def create_reservation(
        self,
        user_id: int,
        spot_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ):
        spot = await self.parking_repo.get_spot_by_id(spot_id)
        if not spot:
            raise ValueError("Parking spot not found")

        if spot.status != "Available":
            raise ValueError(f"Spot is currently {spot.status}")

        now = datetime.utcnow()
        if not start_time:
            start_time = now
        if not end_time:
            end_time = now + timedelta(seconds=30)

        reservation = await self.repo.create_reservation(user_id, spot_id, start_time, end_time)

        await self.parking_repo.update_spot_status(spot_id, "Reserved")

        asyncio.create_task(self._expire_reservation(spot_id, 30))

        return reservation

    async def _expire_reservation(self, spot_id: int, delay_seconds: int):
        await asyncio.sleep(delay_seconds)

        spot = await self.parking_repo.get_spot_by_id(spot_id)
        if spot and spot.status == "Reserved":
            await self.parking_repo.update_spot_status(spot_id, "Available")
            print(f"Reservation expired for spot {spot_id}, status reverted to Available")

    async def update_reservation(self, reservation_id: int, **updates):
        reservation = await self.repo.update_reservation(reservation_id, **updates)
        if not reservation:
            raise ValueError("Reservation not found")
        return reservation

    async def delete_reservation(self, reservation_id: int):
        reservation = await self.repo.delete_reservation(reservation_id)
        if not reservation:
            raise ValueError("Reservation not found")

        if reservation.spot_id:
            spot = await self.parking_repo.get_spot_by_id(reservation.spot_id)
            if spot and spot.status == "Reserved":
                await self.parking_repo.update_spot_status(reservation.spot_id, "Available")

        return reservation
