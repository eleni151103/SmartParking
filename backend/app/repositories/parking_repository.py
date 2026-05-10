
from __future__ import annotations

import logging
from decimal import Decimal
from datetime import datetime
from typing import Optional, Tuple, List, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete
from app.models import ParkingSpot, PaidParking
from app.database import redis_client

logger = logging.getLogger(__name__)


def _s(x) -> str:
    if isinstance(x, (bytes, bytearray)):
        return x.decode("utf-8", errors="replace")
    return "" if x is None else str(x)


def _get_any(d: dict, *keys, default=None):
    for k in keys:
        if k in d:
            return d[k]
    return default


def _parse_dt(x: Optional[str]) -> Optional[datetime]:
    if not x:
        return None
    try:
        s = x.replace("Z", "+00:00") if x.endswith("Z") else x
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _member_to_id(member: bytes | str) -> Optional[int]:
    v = _s(member)
    if v.startswith("spot_"):
        v = v.split("_", 1)[1]
    try:
        return int(v)
    except Exception:
        return None


class ParkingRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_paid_prices_map(self) -> Dict[int, Decimal]:
        res = await self.db.execute(select(PaidParking.spot_id, PaidParking.price_per_hour))
        rows = res.all()
        return {int(spot_id): (price if isinstance(price, Decimal) else Decimal(str(price)))
                for (spot_id, price) in rows}

    async def get_all_spots(self) -> List[ParkingSpot]:
        res = await self.db.execute(select(ParkingSpot))
        spots = res.scalars().all()
        paid_map = await self._get_paid_prices_map()
        for spot in spots:
            spot.price_per_hour = paid_map.get(spot.id)
        return spots

    async def get_spot_by_id(self, spot_id: int) -> Optional[ParkingSpot]:
        return await self.db.get(ParkingSpot, spot_id)

    async def create_spot(
        self,
        location: str,
        latitude: float,
        longitude: float,
        status: str,
        city: Optional[str] = None,
        area: Optional[str] = None,
        price_per_hour: Optional[float] = None
    ) -> ParkingSpot:
        spot = ParkingSpot(
            location=location, latitude=latitude, longitude=longitude,
            status=status, city=city, area=area
        )
        self.db.add(spot)
        await self.db.flush()

        if price_per_hour is not None and price_per_hour > 0:
            paid = PaidParking(spot_id=spot.id, price_per_hour=Decimal(str(price_per_hour)))
            self.db.add(paid)

        await self.db.commit()
        await self.db.refresh(spot)

        if price_per_hour is not None and price_per_hour > 0:
            spot.price_per_hour = Decimal(str(price_per_hour))
        else:
            spot.price_per_hour = None

        try:
            mapping = {
                "id": str(spot.id),
                "latitude": str(spot.latitude),
                "longitude": str(spot.longitude),
                "location": spot.location,
                "status": spot.status,
                "last_updated": spot.last_updated.isoformat() if spot.last_updated else "",
            }

            if price_per_hour is not None and price_per_hour > 0:
                mapping["price_per_hour"] = str(price_per_hour)
                await redis_client.sadd("spots:paid", spot.id)

            await redis_client.hset(f"spot:{spot.id}", mapping=mapping)

            await redis_client.sadd(f"spots:by_status:{spot.status}", spot.id)

            await redis_client.execute_command(
                "GEOADD", f"spots:geo:{spot.status}",
                float(spot.longitude), float(spot.latitude), f"spot_{spot.id}"
            )

        except Exception as e:
            logger.error(f"Redis update failed after create: {e}")

        return spot

    async def update_spot(self, spot_id: int, **updates) -> Optional[ParkingSpot]:
        spot = await self.db.get(ParkingSpot, spot_id)
        if not spot:
            return None

        price_per_hour = updates.pop("price_per_hour", None)

        for k, v in updates.items():
            if v is not None:
                setattr(spot, k, v)

        await self.db.commit()

        if price_per_hour is not None and price_per_hour > 0:
            await self.upsert_paid_price(spot_id, price_per_hour)
            spot.price_per_hour = price_per_hour
        elif price_per_hour == 0:
            await self.remove_paid_price(spot_id)
            spot.price_per_hour = None

        return spot

    async def delete_spot(self, spot_id: int) -> Optional[ParkingSpot]:
        spot = await self.db.get(ParkingSpot, spot_id)
        if spot:
            old_status = spot.status
            await self.db.delete(spot)
            await self.db.commit()
            try:
                await redis_client.delete(f"spot:{spot_id}")
                await redis_client.srem(f"spots:by_status:{old_status}", spot_id)
                await redis_client.zrem(f"spots:geo:{old_status}", f"spot_{spot_id}")
                await redis_client.srem("spots:paid", spot_id)
            except Exception as e:
                logger.error(f"Redis cleanup failed after delete of spot {spot_id}: {e}")
        return spot

    async def get_spots_in_viewport(
        self,
        sw_lat: float,
        sw_lng: float,
        ne_lat: float,
        ne_lng: float,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[ParkingSpot]:
        q = select(ParkingSpot).where(
            ParkingSpot.latitude >= sw_lat,
            ParkingSpot.latitude <= ne_lat,
            ParkingSpot.longitude >= sw_lng,
            ParkingSpot.longitude <= ne_lng,
        )

        if status:
            q = q.where(ParkingSpot.status == status)

        q = q.order_by(ParkingSpot.last_updated.desc()).limit(limit)
        res = await self.db.execute(q)
        spots = list(res.scalars().all())

        paid_map = await self._get_paid_prices_map()
        for spot in spots:
            if spot.id in paid_map:
                spot.price_per_hour = paid_map[spot.id]
            else:
                spot.price_per_hour = None

        return spots

    async def get_spots_in_viewport_cached(
        self,
        sw_lat: float,
        sw_lng: float,
        ne_lat: float,
        ne_lng: float,
        status: Optional[str] = None,
    ) -> Tuple[List[ParkingSpot], bool]:
        geo_key = f"spots:geo:{status}" if status else "spots:geo:Available"

        center_lng = (sw_lng + ne_lng) / 2
        center_lat = (sw_lat + ne_lat) / 2

        radius_km = max(abs(ne_lat - sw_lat), abs(ne_lng - sw_lng)) * 111.32

        logger.debug(f"Searching for spots in radius {radius_km}km around {center_lat}, {center_lng} ({geo_key})")

        try:
            members = await redis_client.geosearch(
                geo_key,
                longitude=center_lng,
                latitude=center_lat,
                radius=radius_km,
                unit="km",
                sort="ASC",
                count=2000,
            )
        except Exception:
            return [], False

        if not members:
            return [], False

        ids = [sid for sid in (_member_to_id(m) for m in members) if sid is not None]
        if not ids:
            return [], False

        spots: List[ParkingSpot] = []
        for sid in ids:
            raw = await redis_client.hgetall(f"spot:{sid}")
            if not raw:
                continue

            m = {_s(k): _s(v) for k, v in raw.items()}

            try:
                pid = int(m.get("id", str(sid)))
                lat = float(m.get("latitude", "nan"))
                lng = float(m.get("longitude", "nan"))
                loc = m.get("location", "")
                st = m.get("status", "")
                lu = _parse_dt(m.get("last_updated"))
                price_per_hour = m.get("price_per_hour")

                if any(map(lambda x: x != x, [lat, lng])) or not st:
                    continue

                price = None
                if price_per_hour:
                    try:
                        price = Decimal(price_per_hour)
                    except:
                        price = None

                p = ParkingSpot(
                    id=pid, latitude=lat, longitude=lng,
                    location=loc, status=st, last_updated=lu,
                    price_per_hour=price
                )
                spots.append(p)

            except Exception:
                continue

        if not spots:
            return [], False

        return spots, True

    async def preload_spots_to_cache(self) -> None:
        logger.info("Preloading all spots into Redis cache...")

        all_spots = await self.get_all_spots()
        paid_map = await self._get_paid_prices_map()

        try:
            await redis_client.delete("spots:paid")
        except Exception:
            pass

        for spot in all_spots:
            try:
                mapping = {
                    "id": str(spot.id),
                    "latitude": "" if spot.latitude is None else str(spot.latitude),
                    "longitude": "" if spot.longitude is None else str(spot.longitude),
                    "location": spot.location,
                    "status": spot.status,
                    "last_updated": (spot.last_updated.isoformat() if spot.last_updated else ""),
                }

                if spot.id in paid_map:
                    price = paid_map[spot.id]
                    mapping["price_per_hour"] = str(price)
                    await redis_client.sadd("spots:paid", spot.id)

                await redis_client.hset(f"spot:{spot.id}", mapping=mapping)

                await redis_client.sadd(f"spots:by_status:{spot.status}", spot.id)

                if spot.longitude is not None and spot.latitude is not None:
                    await redis_client.execute_command(
                        "GEOADD", f"spots:geo:{spot.status}",
                        float(spot.longitude), float(spot.latitude), f"spot_{spot.id}"
                    )

                logger.debug(f"Preloaded spot {spot.id} (status={spot.status})")

            except Exception as e:
                logger.error(f"Error preloading spot {spot.id}: {e}")

        logger.info(f"Cache preload complete: {len(all_spots)} spots indexed.")

    async def upsert_paid_price(self, spot_id: int, price_per_hour: float) -> None:
        exists = await self.db.get(PaidParking, spot_id)
        if exists:
            exists.price_per_hour = Decimal(str(price_per_hour))
        else:
            self.db.add(PaidParking(spot_id=spot_id, price_per_hour=Decimal(str(price_per_hour))))
        await self.db.commit()

        await redis_client.hset(f"spot:{spot_id}", mapping={"price_per_hour": str(price_per_hour)})
        await redis_client.sadd("spots:paid", spot_id)

    async def remove_paid_price(self, spot_id: int) -> None:
        await self.db.execute(delete(PaidParking).where(PaidParking.spot_id == spot_id))
        await self.db.commit()

        await redis_client.hdel(f"spot:{spot_id}", "price_per_hour")
        await redis_client.srem("spots:paid", spot_id)

    async def get_distinct_locations(self) -> Tuple[List[str], Dict[str, List[str]]]:
        query = select(ParkingSpot.city, ParkingSpot.area).distinct().where(
            ParkingSpot.city != None,
            ParkingSpot.area != None
        )
        res = await self.db.execute(query)
        rows = res.all()

        cities = sorted(list(set(r[0] for r in rows)))

        areas: Dict[str, List[str]] = {city: [] for city in cities}
        for city, area in rows:
            if area not in areas[city]:
                areas[city].append(area)

        for city in areas:
            areas[city].sort()

        return cities, areas

    async def search_spots(
        self,
        city: str,
        area: Optional[str] = None,
        is_free: Optional[bool] = None
    ) -> Optional[Tuple[int, float, float]]:
        query = select(
            ParkingSpot.id, ParkingSpot.latitude, ParkingSpot.longitude
        ).where(
            ParkingSpot.city == city,
            ParkingSpot.status == "Available"
        )

        if area:
            query = query.where(ParkingSpot.area == area)

        if is_free is not None:
            if is_free:
                query = query.outerjoin(PaidParking).where(PaidParking.spot_id == None)
            else:
                query = query.join(PaidParking)

        query = query.limit(1)
        res = await self.db.execute(query)
        result = res.first()

        return result if result else None

    async def update_spot_status(self, spot_id: int, new_status: str) -> Optional[ParkingSpot]:
        spot = await self.db.get(ParkingSpot, spot_id)
        if not spot:
            return None

        old_status = spot.status

        spot.status = new_status
        spot.last_updated = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(spot)

        try:
            await redis_client.hset(f"spot:{spot_id}", mapping={
                "status": new_status,
                "last_updated": spot.last_updated.isoformat()
            })

            await redis_client.srem(f"spots:by_status:{old_status}", spot_id)
            await redis_client.sadd(f"spots:by_status:{new_status}", spot_id)

            await redis_client.zrem(f"spots:geo:{old_status}", f"spot_{spot_id}")

            if spot.longitude is not None and spot.latitude is not None:
                await redis_client.geoadd(
                    f"spots:geo:{new_status}",
                    float(spot.longitude), float(spot.latitude), f"spot_{spot_id}"
                )

        except Exception as e:
            logger.error(f"Failed to update Redis for spot {spot_id}: {e}")

        return spot
