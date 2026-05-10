
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.user_service import UserService
from app.repositories.user_repository import UserRepository
from app.dtos.user_dto import UserCreate, UserUpdate, UserResponse, UserLogin, LoginResponse
from app.core.security import create_access_token
from app.core.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    repo = UserRepository(db)
    return UserService(repo)


@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, service: UserService = Depends(get_user_service)):
    try:
        user = await service.login(credentials.email, credentials.password)

        access_token = create_access_token(subject=user.id)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/", response_model=list[UserResponse])
async def get_all_users(
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_all_users()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    try:
        return await service.get_user_by_id(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, service: UserService = Depends(get_user_service)):
    return await service.create_user(user.email, user.password, user.full_name)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    updates: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this user")

        return await service.update_user(user_id, **updates.dict(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{user_id}", response_model=UserResponse)
async def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this user")
        return await service.delete_user(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{user_id}/favorites/{spot_id}")
async def add_favorite(
    user_id: int,
    spot_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        await service.add_favorite(user_id, spot_id)
        return {"message": "Favorite added"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}/favorites/{spot_id}")
async def remove_favorite(
    user_id: int,
    spot_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        await service.remove_favorite(user_id, spot_id)
        return {"message": "Favorite removed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}/favorites", response_model=list[int])
async def get_favorites(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await service.get_favorites(user_id)
