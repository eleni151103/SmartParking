
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User, UserFavorites
from app.database import redis_client
from typing import List, Optional


class UserRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_users(self) -> List[User]:
        result = await self.db.execute(select(User))
        return result.scalars().all()

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        return await self.db.get(User, user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, email: str, password_hash: str, full_name: str) -> User:
        new_user = User(email=email, password_hash=password_hash, full_name=full_name)

        self.db.add(new_user)

        await self.db.commit()

        await self.db.refresh(new_user)

        return new_user

    async def update_user(self, user_id: int, **updates) -> Optional[User]:
        user = await self.db.get(User, user_id)
        if not user:
            return None

        for key, value in updates.items():
            if value is not None:
                setattr(user, key, value)

        await self.db.commit()

        return user

    async def delete_user(self, user_id: int) -> Optional[User]:
        user = await self.db.get(User, user_id)
        if user:
            await self.db.delete(user)
            await self.db.commit()
        return user

    async def add_favorite(self, user_id: int, spot_id: int) -> None:
        stmt = select(UserFavorites).where(
            UserFavorites.user_id == user_id,
            UserFavorites.spot_id == spot_id
        )
        existing = await self.db.execute(stmt)

        if not existing.scalar_one_or_none():
            fav = UserFavorites(user_id=user_id, spot_id=spot_id)
            self.db.add(fav)
            await self.db.commit()

        await redis_client.sadd(f"user:{user_id}:favorites", spot_id)

    async def remove_favorite(self, user_id: int, spot_id: int) -> None:
        stmt = select(UserFavorites).where(
            UserFavorites.user_id == user_id,
            UserFavorites.spot_id == spot_id
        )
        result = await self.db.execute(stmt)
        fav = result.scalar_one_or_none()

        if fav:
            await self.db.delete(fav)
            await self.db.commit()

        await redis_client.srem(f"user:{user_id}:favorites", spot_id)

    async def get_favorites(self, user_id: int) -> List[int]:
        key = f"user:{user_id}:favorites"
        members = await redis_client.smembers(key)

        if members:
            return [int(m) for m in members]

        stmt = select(UserFavorites.spot_id).where(UserFavorites.user_id == user_id)
        result = await self.db.execute(stmt)
        spot_ids = result.scalars().all()

        if spot_ids:
            await redis_client.sadd(key, *spot_ids)

        return list(spot_ids)
