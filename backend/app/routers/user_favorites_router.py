"""
user_favorites_router.py - User Favorites API Endpoints

Provides REST endpoints for:
- Managing user's favorite parking spots (add/remove/list)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.user_favorites_service import UserFavoritesService
from app.repositories.user_favorites_repository import UserFavoritesRepository
from app.dtos.user_favorites_dto import UserFavoritesCreate, UserFavoritesResponse

router = APIRouter(prefix="/favorites", tags=["favorites"])

def get_user_favorites_service(db: AsyncSession = Depends(get_db)) -> UserFavoritesService:
    repo = UserFavoritesRepository(db)
    return UserFavoritesService(repo)

@router.get("/", response_model=list[UserFavoritesResponse])
async def get_all_favorites(service: UserFavoritesService = Depends(get_user_favorites_service)):
    return await service.get_all_favorites()

@router.get("/user/{user_id}", response_model=list[UserFavoritesResponse])
async def get_user_favorites(user_id: int, service: UserFavoritesService = Depends(get_user_favorites_service)):
    return await service.get_user_favorites(user_id)

@router.post("/", response_model=UserFavoritesResponse)
async def add_favorite(favorite: UserFavoritesCreate, service: UserFavoritesService = Depends(get_user_favorites_service)):
    try:
        return await service.add_favorite(favorite.user_id, favorite.spot_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/user/{user_id}/spot/{spot_id}", response_model=UserFavoritesResponse)
async def remove_favorite(user_id: int, spot_id: int, service: UserFavoritesService = Depends(get_user_favorites_service)):
    try:
        return await service.remove_favorite(user_id, spot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
