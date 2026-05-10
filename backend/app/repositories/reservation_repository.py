
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Reservation
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import joinedload


class ReservationRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_reservations(self) -> List[Reservation]:
        result = await self.db.execute(
            select(Reservation).options(joinedload(Reservation.spot))
        )
        return result.scalars().all()

    async def get_reservation_by_id(self, reservation_id: int) -> Optional[Reservation]:
        result = await self.db.execute(
            select(Reservation)
            .where(Reservation.id == reservation_id)
            .options(joinedload(Reservation.spot))
        )
        return result.scalar_one_or_none()

    async def get_reservations_by_user_id(self, user_id: int) -> List[Reservation]:
        result = await self.db.execute(
            select(Reservation)
            .where(Reservation.user_id == user_id)
            .options(joinedload(Reservation.spot))
        )
        return result.scalars().all()

    async def get_reservations_by_spot_id(self, spot_id: int) -> List[Reservation]:
        result = await self.db.execute(
            select(Reservation)
            .where(Reservation.spot_id == spot_id)
            .options(joinedload(Reservation.spot))
        )
        return result.scalars().all()

    async def create_reservation(
        self,
        user_id: int,
        spot_id: int,
        start_time: datetime,
        end_time: Optional[datetime] = None
    ) -> Reservation:
        reservation = Reservation(
            user_id=user_id,
            spot_id=spot_id,
            start_time=start_time,
            end_time=end_time
        )

        self.db.add(reservation)
        await self.db.commit()
        await self.db.refresh(reservation)

        return await self.get_reservation_by_id(reservation.id)

    async def update_reservation(self, reservation_id: int, **updates) -> Optional[Reservation]:
        reservation = await self.db.get(Reservation, reservation_id)
        if not reservation:
            return None

        for key, value in updates.items():
            if value is not None:
                setattr(reservation, key, value)

        await self.db.commit()

        return await self.get_reservation_by_id(reservation_id)

    async def delete_reservation(self, reservation_id: int) -> Optional[Reservation]:
        reservation = await self.get_reservation_by_id(reservation_id)
        if reservation:
            await self.db.delete(reservation)
            await self.db.commit()
        return reservation
