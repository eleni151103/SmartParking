"""
user_favorites_repository.py - User Favorites Data Access Layer

Handles database operations for user's favorite parking spots.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import UserFavorites
from typing import List, Optional

class UserFavoritesRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_favorites(self, user_id: int) -> List[UserFavorites]:
        result = await self.db.execute(
            select(UserFavorites).where(UserFavorites.user_id == user_id)
        )
        return result.scalars().all()

    async def get_favorite(self, user_id: int, spot_id: int) -> Optional[UserFavorites]:
        result = await self.db.execute(
            select(UserFavorites).where(
                UserFavorites.user_id == user_id,
                UserFavorites.spot_id == spot_id
            )
        )
        return result.scalar_one_or_none()

    async def add_favorite(self, user_id: int, spot_id: int) -> UserFavorites:
        favorite = UserFavorites(user_id=user_id, spot_id=spot_id)
        self.db.add(favorite)
        await self.db.commit()
        await self.db.refresh(favorite)
        return favorite

    async def remove_favorite(self, user_id: int, spot_id: int) -> Optional[UserFavorites]:
        favorite = await self.get_favorite(user_id, spot_id)
        if favorite:
            await self.db.delete(favorite)
            await self.db.commit()
        return favorite

    async def get_all_favorites(self) -> List[UserFavorites]:
        result = await self.db.execute(select(UserFavorites))
        return result.scalars().all()
