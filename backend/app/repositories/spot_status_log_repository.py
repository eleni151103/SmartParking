"""
spot_status_log_repository.py - Status Log Data Access Layer

Handles database operations for parking spot status history.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models import SpotStatusLog
from typing import List, Optional

class SpotStatusLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_logs(self) -> List[SpotStatusLog]:
        result = await self.db.execute(select(SpotStatusLog).order_by(desc(SpotStatusLog.timestamp)))
        return result.scalars().all()

    async def get_log_by_id(self, log_id: int) -> Optional[SpotStatusLog]:
        return await self.db.get(SpotStatusLog, log_id)

    async def get_logs_by_spot_id(self, spot_id: int) -> List[SpotStatusLog]:
        result = await self.db.execute(
            select(SpotStatusLog).where(SpotStatusLog.spot_id == spot_id)
            .order_by(desc(SpotStatusLog.timestamp))
        )
        return result.scalars().all()

    async def create_log(self, spot_id: int, status: str) -> SpotStatusLog:
        log = SpotStatusLog(spot_id=spot_id, status=status)
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def delete_log(self, log_id: int) -> Optional[SpotStatusLog]:
        log = await self.db.get(SpotStatusLog, log_id)
        if log:
            await self.db.delete(log)
            await self.db.commit()
        return log
