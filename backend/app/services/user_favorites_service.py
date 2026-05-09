"""
user_favorites_service.py - User Favorites Business Logic

Manages user's favorite parking spots.
"""

from app.repositories.user_favorites_repository import UserFavoritesRepository

class UserFavoritesService:
    def __init__(self, repo: UserFavoritesRepository):
        self.repo = repo

    async def get_user_favorites(self, user_id: int):
        return await self.repo.get_user_favorites(user_id)

    async def add_favorite(self, user_id: int, spot_id: int):
        # Check if favorite already exists
        existing = await self.repo.get_favorite(user_id, spot_id)
        if existing:
            raise ValueError("Favorite already exists")
        return await self.repo.add_favorite(user_id, spot_id)

    async def remove_favorite(self, user_id: int, spot_id: int):
        favorite = await self.repo.remove_favorite(user_id, spot_id)
        if not favorite:
            raise ValueError("Favorite not found")
        return favorite

    async def get_all_favorites(self):
        return await self.repo.get_all_favorites()
