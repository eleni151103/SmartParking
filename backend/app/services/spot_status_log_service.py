"""
spot_status_log_service.py - Status Log Business Logic

Manages historical status change records for parking spots.
Used for analytics and debugging sensor data.
"""

from app.repositories.spot_status_log_repository import SpotStatusLogRepository

class SpotStatusLogService:
    def __init__(self, repo: SpotStatusLogRepository):
        self.repo = repo

    async def get_all_logs(self):
        return await self.repo.get_all_logs()

    async def get_log_by_id(self, log_id: int):
        log = await self.repo.get_log_by_id(log_id)
        if not log:
            raise ValueError("Log not found")
        return log

    async def get_logs_by_spot_id(self, spot_id: int):
        return await self.repo.get_logs_by_spot_id(spot_id)

    async def create_log(self, spot_id: int, status: str):
        return await self.repo.create_log(spot_id, status)

    async def delete_log(self, log_id: int):
        log = await self.repo.delete_log(log_id)
        if not log:
            raise ValueError("Log not found")
        return log
