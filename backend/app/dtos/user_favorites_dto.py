
from pydantic import BaseModel

class UserFavoritesBase(BaseModel):
    user_id: int
    spot_id: int

class UserFavoritesCreate(UserFavoritesBase):
    pass

class UserFavoritesResponse(UserFavoritesBase):

    class Config:
        from_attributes = True
