"""
user_favorites_dto.py - User Favorites Data Transfer Objects

Pydantic schemas for user favorites API requests and responses.
"""

from pydantic import BaseModel

class UserFavoritesBase(BaseModel):
    user_id: int
    spot_id: int

class UserFavoritesCreate(UserFavoritesBase):
    pass

class UserFavoritesResponse(UserFavoritesBase):

    class Config:
        from_attributes = True
