
from app.repositories.parking_repository import ParkingRepository
from app.models import ParkingSpot
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ParkingService:

    def __init__(self, repo: ParkingRepository):
        self.repo = repo

    async def get_all_spots(self):
        return await self.repo.get_all_spots()

    async def get_spot_by_id(self, spot_id: int):
        spot = await self.repo.get_spot_by_id(spot_id)
        if not spot:
            raise ValueError("Spot not found")
        return spot

    async def create_spot(self, spot_data: dict):
        return await self.repo.create_spot(**spot_data)

    async def update_spot(self, spot_id: int, **updates):
        spot = await self.repo.update_spot(spot_id, **updates)
        if not spot:
            raise ValueError("Spot not found")
        return spot

    async def delete_spot(self, spot_id: int):
        spot = await self.repo.delete_spot(spot_id)
        if not spot:
            raise ValueError("Spot not found")

    async def get_spots_in_viewport(self, sw_lat, sw_lng, ne_lat, ne_lng, status, limit):
        spots, hit = await self.repo.get_spots_in_viewport_cached(
            sw_lat, sw_lng, ne_lat, ne_lng, status
        )

        if hit and spots:
            logger.info("Fetched from cache")
            return spots

        spots = await self.repo.get_spots_in_viewport(sw_lat, sw_lng, ne_lat, ne_lng, status, limit)
        logger.info("Fetched from DB")
        return spots

    async def get_distinct_locations(self):
        return await self.repo.get_distinct_locations()

    async def search_spots(self, city: str, area: Optional[str], is_free: Optional[bool]):
        spot_data = await self.repo.search_spots(city, area, is_free)
        if not spot_data:
            raise ValueError("No available spots found for the selected criteria.")
        return spot_data
