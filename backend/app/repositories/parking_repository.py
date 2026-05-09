"""
=======================================================================
parking_repository.py - Πρόσβαση Δεδομένων Θέσεων Στάθμευσης
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Είναι το "χέρι" που αγγίζει τη βάση και το Redis για θέσεις στάθμευσης.
    Υλοποιεί το "Cache-Aside" pattern:
    1. Ψάχνει πρώτα στο Redis (γρήγορα)
    2. Αν δεν βρει (cache miss), ψάχνει στη βάση (αργά)
    3. Αποθηκεύει το αποτέλεσμα στο Redis για επόμενες φορές

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Αντί να κάνουμε SQL queries σε κάθε map move του χρήστη
    (που μπορεί να είναι δεκάδες φορές ανά λεπτό),
    διαβάζουμε από το Redis που είναι 10-100x πιο γρήγορο.

ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ ΤΟ REDIS GEO:
    Το Redis αποθηκεύει κάθε θέση ως γεωγραφικό σημείο.
    Μπορεί να βρει ΓΡΗΓΟΡΑ ποιες θέσεις είναι μέσα σε ακτίνα X km
    από ένα κεντρικό σημείο (το κέντρο του χάρτη).

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Καλείται από parking_service.py, mqtt_consumer.py.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    parking_service.py, mqtt_consumer.py, database.py
=======================================================================
"""

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


# --- Βοηθητικές Συναρτήσεις (Helper Functions) ---

def _s(x) -> str:
    """
    ΤΙ ΚΑΝΕΙ: Μετατρέπει οποιαδήποτε τιμή σε string με ασφάλεια.
    Αν είναι bytes, τα αποκωδικοποιεί. Αν είναι None, επιστρέφει "".
    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ: Το Redis επιστρέφει bytes ή strings - αυτό τα ομογενοποιεί.
    """
    if isinstance(x, (bytes, bytearray)):
        return x.decode("utf-8", errors="replace")
    return "" if x is None else str(x)


def _get_any(d: dict, *keys, default=None):
    """
    ΤΙ ΚΑΝΕΙ: Ψάχνει στο dictionary d για οποιοδήποτε από τα keys.
    Επιστρέφει την πρώτη τιμή που βρίσκει, αλλιώς το default.
    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ: Τα δεδομένα μπορεί να έχουν διαφορετικά ονόματα πεδίων.
    """
    for k in keys:
        if k in d:
            return d[k]
    return default


def _parse_dt(x: Optional[str]) -> Optional[datetime]:
    """
    ΤΙ ΚΑΝΕΙ: Μετατρέπει ένα string ημερομηνίας σε datetime αντικείμενο.
    ΠΑΡΑΔΕΙΓΜΑ: "2024-01-15T10:30:00" → datetime(2024, 1, 15, 10, 30, 0)
    ΕΠΙΣΤΡΕΦΕΙ: datetime ή None αν αποτύχει.
    """
    if not x:
        return None
    try:
        # Αντικαθιστούμε το "Z" (UTC marker) με "+00:00" για συμβατότητα
        s = x.replace("Z", "+00:00") if x.endswith("Z") else x
        return datetime.fromisoformat(s)
    except Exception:
        return None


def _member_to_id(member: bytes | str) -> Optional[int]:
    """
    ΤΙ ΚΑΝΕΙ: Μετατρέπει ένα Redis GEO member (π.χ. "spot_42") σε int id (42).
    ΠΑΡΑΔΕΙΓΜΑ: "spot_42" → 42
    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ: Αποθηκεύουμε στο Redis με format "spot_{id}".
    """
    v = _s(member)
    if v.startswith("spot_"):
        v = v.split("_", 1)[1]  # Παίρνουμε ό,τι είναι μετά το "spot_"
    try:
        return int(v)
    except Exception:
        return None


class ParkingRepository:
    """
    Κλάση που διαχειρίζεται όλες τις λειτουργίες θέσεων στη βάση και Redis.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_paid_prices_map(self) -> Dict[int, Decimal]:
        """
        ΤΙ ΚΑΝΕΙ: Φέρνει όλες τις τιμές πληρωμένων θέσεων ως dictionary.
        ΕΠΙΣΤΡΕΦΕΙ: {spot_id: price} π.χ. {3: Decimal("2.50"), 7: Decimal("1.00")}
        ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ: Για να προσθέτουμε τιμή σε κάθε θέση που επιστρέφουμε.
        """
        res = await self.db.execute(select(PaidParking.spot_id, PaidParking.price_per_hour))
        rows = res.all()
        # Δημιουργούμε dictionary: spot_id → τιμή (ως Decimal για ακρίβεια)
        return {int(spot_id): (price if isinstance(price, Decimal) else Decimal(str(price)))
                for (spot_id, price) in rows}

    async def get_all_spots(self) -> List[ParkingSpot]:
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει ΟΛΑ τα parking spots από τη βάση.
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα ParkingSpot αντικειμένων.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Κατά startup για preload στο Redis, από admin.
        """
        res = await self.db.execute(select(ParkingSpot))
        return res.scalars().all()

    async def get_spot_by_id(self, spot_id: int) -> Optional[ParkingSpot]:
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει μια θέση με το id της.
        ΠΑΡΑΜΕΤΡΟΙ: spot_id - το id της θέσης
        ΕΠΙΣΤΡΕΦΕΙ: ParkingSpot ή None αν δεν βρεθεί.
        """
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
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί νέα θέση στάθμευσης στη βάση ΚΑΙ στο Redis.
        ΠΑΡΑΜΕΤΡΟΙ:
            location: διεύθυνση
            latitude, longitude: συντεταγμένες
            status: αρχική κατάσταση
            city, area: πόλη/περιοχή (προαιρετικά)
            price_per_hour: τιμή αν είναι επί πληρωμή (None = δωρεάν)
        ΕΠΙΣΤΡΕΦΕΙ: Το νέο ParkingSpot αντικείμενο με id.

        ΣΗΜΕΙΩΣΗ: Αν δοθεί τιμή, δημιουργεί και εγγραφή στο paid_parking.
        Επίσης ενημερώνει το Redis αμέσως για να εμφανιστεί στον χάρτη.
        """
        # Δημιουργούμε τη θέση
        spot = ParkingSpot(
            location=location, latitude=latitude, longitude=longitude,
            status=status, city=city, area=area
        )
        self.db.add(spot)
        await self.db.flush()  # flush: παίρνουμε το id χωρίς commit ακόμα

        # Αν η θέση είναι επί πληρωμή, δημιουργούμε εγγραφή τιμολόγησης
        if price_per_hour is not None and price_per_hour > 0:
            paid = PaidParking(spot_id=spot.id, price_per_hour=Decimal(str(price_per_hour)))
            self.db.add(paid)

        # Αποθηκεύουμε στη βάση
        await self.db.commit()
        await self.db.refresh(spot)

        # Προσθέτουμε χειροκίνητα την τιμή στο αντικείμενο για άμεση επιστροφή
        if price_per_hour is not None and price_per_hour > 0:
            spot.price_per_hour = Decimal(str(price_per_hour))
        else:
            spot.price_per_hour = None

        # Ενημερώνουμε το Redis ώστε η νέα θέση να εμφανιστεί αμέσως στον χάρτη
        try:
            mapping = {
                "id": str(spot.id),
                "latitude": str(spot.latitude),
                "longitude": str(spot.longitude),
                "location": spot.location,
                "status": spot.status,
                "last_updated": spot.last_updated.isoformat() if spot.last_updated else "",
            }

            # Αν είναι επί πληρωμή, αποθηκεύουμε και την τιμή
            if price_per_hour is not None and price_per_hour > 0:
                mapping["price_per_hour"] = str(price_per_hour)
                await redis_client.sadd("spots:paid", spot.id)  # Προσθήκη σε paid set

            # hset: αποθηκεύει hash (dictionary) στο Redis με κλειδί "spot:{id}"
            await redis_client.hset(f"spot:{spot.id}", mapping=mapping)

            # Προσθέτουμε στο status set (για φιλτράρισμα κατά status)
            await redis_client.sadd(f"spots:by_status:{spot.status}", spot.id)

            # Προσθέτουμε στο GEO index (για αναζήτηση κοντινών θέσεων)
            await redis_client.execute_command(
                "GEOADD", f"spots:geo:{spot.status}",
                float(spot.longitude), float(spot.latitude), f"spot_{spot.id}"
            )

        except Exception as e:
            logger.error(f"Redis update failed after create: {e}")

        return spot

    async def update_spot(self, spot_id: int, **updates) -> Optional[ParkingSpot]:
        """
        ΤΙ ΚΑΝΕΙ: Ενημερώνει τα πεδία μιας θέσης στη βάση.
        ΠΑΡΑΜΕΤΡΟΙ:
            spot_id: το id της θέσης
            **updates: τα πεδία που αλλάζουν (π.χ. status="Occupied")
        ΕΠΙΣΤΡΕΦΕΙ: Την ενημερωμένη θέση ή None αν δεν βρεθεί.

        ΣΗΜΕΙΩΣΗ: Δεν ενημερώνει το Redis (αυτό γίνεται μέσω MQTT consumer).
        """
        spot = await self.db.get(ParkingSpot, spot_id)
        if not spot:
            return None

        # Εφαρμόζουμε κάθε αλλαγή
        for k, v in updates.items():
            if v is not None:
                setattr(spot, k, v)  # Θέτουμε δυναμικά το πεδίο

        await self.db.commit()
        return spot

    async def delete_spot(self, spot_id: int) -> Optional[ParkingSpot]:
        """
        ΤΙ ΚΑΝΕΙ: Διαγράφει μια θέση από τη βάση.
        ΠΑΡΑΜΕΤΡΟΙ: spot_id - το id προς διαγραφή
        ΕΠΙΣΤΡΕΦΕΙ: Τη θέση που διαγράφηκε ή None.
        """
        spot = await self.db.get(ParkingSpot, spot_id)
        if spot:
            await self.db.delete(spot)
            await self.db.commit()
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
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει θέσεις μέσα στα γεωγραφικά όρια του χάρτη (απευθείας από βάση).
        ΠΑΡΑΜΕΤΡΟΙ:
            sw_lat, sw_lng: νοτιοδυτική γωνία (κάτω-αριστερά) του χάρτη
            ne_lat, ne_lng: βορειοανατολική γωνία (πάνω-δεξιά) του χάρτη
            status: προαιρετικό φίλτρο κατάστασης
            limit: μέγιστος αριθμός αποτελεσμάτων
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα θέσεων μέσα στο ορατό τμήμα του χάρτη.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Όταν το Redis δεν έχει δεδομένα (cache miss).
        """
        # Δημιουργούμε ερώτημα: βρες θέσεις που είναι μέσα στα γεωγραφικά όρια
        q = select(ParkingSpot).where(
            ParkingSpot.latitude >= sw_lat,   # Πάνω από νότιο όριο
            ParkingSpot.latitude <= ne_lat,   # Κάτω από βόρειο όριο
            ParkingSpot.longitude >= sw_lng,  # Δεξιά από δυτικό όριο
            ParkingSpot.longitude <= ne_lng,  # Αριστερά από ανατολικό όριο
        )

        # Προσθέτουμε φίλτρο κατάστασης αν ζητήθηκε
        if status:
            q = q.where(ParkingSpot.status == status)

        # Ταξινόμηση: πρώτα οι πιο πρόσφατα ενημερωμένες, με όριο αποτελεσμάτων
        q = q.order_by(ParkingSpot.last_updated.desc()).limit(limit)
        res = await self.db.execute(q)
        spots = list(res.scalars().all())

        # Προσθέτουμε τιμολόγηση σε κάθε θέση
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
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει θέσεις μέσα στα όρια χάρτη ΜΕΣΩ REDIS (γρήγορα).

        ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ:
        1. Υπολογίζει το κέντρο και την ακτίνα του χάρτη
        2. Χρησιμοποιεί Redis GEO SEARCH για να βρει θέσεις σε αυτή την ακτίνα
        3. Διαβάζει τα δεδομένα κάθε θέσης από Redis hashes
        4. Δημιουργεί ParkingSpot αντικείμενα και τα επιστρέφει

        ΕΠΙΣΤΡΕΦΕΙ:
            (λίστα θέσεων, True) αν βρήκε στο Redis
            ([], False) αν δεν βρήκε (cache miss → θα πάμε στη βάση)
        """
        # Καθορίζουμε ποιο GEO key να ψάξουμε βάσει κατάστασης
        geo_key = f"spots:geo:{status}" if status else "spots:geo:Available"

        # Υπολογίζουμε κέντρο του χάρτη
        center_lng = (sw_lng + ne_lng) / 2
        center_lat = (sw_lat + ne_lat) / 2

        # Υπολογίζουμε ακτίνα αναζήτησης σε χιλιόμετρα
        # 111.32 km ανά μοίρα (περίπου)
        radius_km = max(abs(ne_lat - sw_lat), abs(ne_lng - sw_lng)) * 111.32

        logger.debug(f"Searching for spots in radius {radius_km}km around {center_lat}, {center_lng} ({geo_key})")

        try:
            # GEOSEARCH: Redis εντολή που βρίσκει γεωγραφικά σημεία εντός ακτίνας
            members = await redis_client.geosearch(
                geo_key,
                longitude=center_lng,
                latitude=center_lat,
                radius=radius_km,
                unit="km",
                sort="ASC",    # Ταξινόμηση από κοντινότερο
                count=2000,    # Μέγιστος αριθμός αποτελεσμάτων
            )
        except Exception:
            return [], False  # Αποτυχία Redis → επιστρέφουμε False για να πάμε σε βάση

        if not members:
            return [], False  # Κανένα αποτέλεσμα στο Redis

        # Μετατρέπουμε "spot_42" → 42
        ids = [sid for sid in (_member_to_id(m) for m in members) if sid is not None]
        if not ids:
            return [], False

        # Για κάθε id, διαβάζουμε τα δεδομένα από το Redis hash
        spots: List[ParkingSpot] = []
        for sid in ids:
            # hgetall: διαβάζει όλα τα πεδία του hash "spot:{id}"
            raw = await redis_client.hgetall(f"spot:{sid}")
            if not raw:
                continue  # Αν δεν βρέθηκε στο hash, πάμε στο επόμενο

            # Μετατρέπουμε κλειδιά/τιμές σε strings
            m = {_s(k): _s(v) for k, v in raw.items()}

            try:
                # Εξάγουμε τα πεδία από το dictionary
                pid = int(m.get("id", str(sid)))
                lat = float(m.get("latitude", "nan"))
                lng = float(m.get("longitude", "nan"))
                loc = m.get("location", "")
                st = m.get("status", "")
                lu = _parse_dt(m.get("last_updated"))
                price_per_hour = m.get("price_per_hour")

                # Αγνοούμε θέσεις με λάθος συντεταγμένες ή κενή κατάσταση
                if any(map(lambda x: x != x, [lat, lng])) or not st:
                    continue

                # Μετατρέπουμε τιμή αν υπάρχει
                price = None
                if price_per_hour:
                    try:
                        price = Decimal(price_per_hour)
                    except:
                        price = None

                # Δημιουργούμε ParkingSpot αντικείμενο από τα Redis δεδομένα
                p = ParkingSpot(
                    id=pid, latitude=lat, longitude=lng,
                    location=loc, status=st, last_updated=lu,
                    price_per_hour=price
                )
                spots.append(p)

            except Exception:
                continue  # Αν αποτύχει η ανάγνωση, πάμε στο επόμενο

        if not spots:
            return [], False

        return spots, True  # True = επιτυχής ανάγνωση από cache

    async def preload_spots_to_cache(self) -> None:
        """
        ΤΙ ΚΑΝΕΙ: Φορτώνει ΟΛΑ τα spots από τη βάση στο Redis κατά startup.

        ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Αν το Redis είναι άδειο (π.χ. μετά από restart), τα πρώτα requests
        θα έβρισκαν κενή cache και θα πήγαιναν στη βάση (αργό).
        Με αυτή τη μέθοδο, ζεσταίνουμε το Redis από την αρχή.

        ΤΙ ΑΠΟΘΗΚΕΥΕΙ ΣΤΟ REDIS:
        - spot:{id} hash: όλα τα δεδομένα της θέσης (location, status, coords κλπ.)
        - spots:by_status:{status} set: ποια spots έχουν ποια κατάσταση
        - spots:geo:{status} sorted set: γεωγραφικές συντεταγμένες κατά κατάσταση
        - spots:paid set: ποια spots είναι επί πληρωμή
        """
        logger.info("Preloading all spots into Redis cache...")

        # Φέρνουμε ΟΛΑ τα spots και τις τιμές
        all_spots = await self.get_all_spots()
        paid_map = await self._get_paid_prices_map()

        # Καθαρίζουμε το paid set για να ξαναχτίσουμε από την αρχή
        try:
            await redis_client.delete("spots:paid")
        except Exception:
            pass

        # Για κάθε θέση, αποθηκεύουμε στο Redis
        for spot in all_spots:
            try:
                # Δημιουργούμε το mapping (dictionary) για το hash
                mapping = {
                    "id": str(spot.id),
                    "latitude": "" if spot.latitude is None else str(spot.latitude),
                    "longitude": "" if spot.longitude is None else str(spot.longitude),
                    "location": spot.location,
                    "status": spot.status,
                    "last_updated": (spot.last_updated.isoformat() if spot.last_updated else ""),
                }

                # Αν είναι επί πληρωμή, προσθέτουμε τιμή
                if spot.id in paid_map:
                    price = paid_map[spot.id]
                    mapping["price_per_hour"] = str(price)
                    await redis_client.sadd("spots:paid", spot.id)

                # Αποθηκεύουμε hash: "spot:5" → {id: "5", latitude: "37.98", ...}
                await redis_client.hset(f"spot:{spot.id}", mapping=mapping)

                # Προσθέτουμε στο status set: "spots:by_status:Available" → {1, 5, 8, ...}
                await redis_client.sadd(f"spots:by_status:{spot.status}", spot.id)

                # Προσθέτουμε στο GEO index αν έχει συντεταγμένες
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
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί ή ενημερώνει την τιμή μιας πληρωμένης θέσης.
        ΠΑΡΑΜΕΤΡΟΙ:
            spot_id: το id της θέσης
            price_per_hour: η νέα τιμή
        ΕΠΙΣΤΡΕΦΕΙ: Τίποτα

        Ενημερώνει τόσο τη βάση δεδομένων όσο και το Redis.
        """
        # Ελέγχουμε αν υπάρχει ήδη τιμολόγηση για αυτή τη θέση
        exists = await self.db.get(PaidParking, spot_id)
        if exists:
            # Αν υπάρχει, ενημερώνουμε
            exists.price_per_hour = Decimal(str(price_per_hour))
        else:
            # Αν δεν υπάρχει, δημιουργούμε
            self.db.add(PaidParking(spot_id=spot_id, price_per_hour=Decimal(str(price_per_hour))))
        await self.db.commit()

        # Ενημερώνουμε το Redis hash και set
        await redis_client.hset(f"spot:{spot_id}", mapping={"price_per_hour": str(price_per_hour)})
        await redis_client.sadd("spots:paid", spot_id)

    async def remove_paid_price(self, spot_id: int) -> None:
        """
        ΤΙ ΚΑΝΕΙ: Αφαιρεί την τιμολόγηση από μια θέση (τη κάνει δωρεάν).
        ΠΑΡΑΜΕΤΡΟΙ: spot_id - το id της θέσης
        ΕΠΙΣΤΡΕΦΕΙ: Τίποτα

        Διαγράφει από τη βάση και καθαρίζει το Redis.
        """
        # Διαγράφουμε από τον πίνακα paid_parking
        await self.db.execute(delete(PaidParking).where(PaidParking.spot_id == spot_id))
        await self.db.commit()

        # Αφαιρούμε τιμή από Redis hash
        await redis_client.hdel(f"spot:{spot_id}", "price_per_hour")
        # Αφαιρούμε από το paid set
        await redis_client.srem("spots:paid", spot_id)

    async def get_distinct_locations(self) -> Tuple[List[str], Dict[str, List[str]]]:
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει λίστα πόλεων και περιοχών για τα dropdowns αναζήτησης.
        ΕΠΙΣΤΡΕΦΕΙ:
            (λίστα πόλεων, {πόλη: [λίστα περιοχών]})
            Π.χ. (["Athens", "Larissa"], {"Athens": ["Kolonaki", "Exarchia"]})

        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για το Search Modal στο frontend.
        """
        # Βρίσκουμε μοναδικά (distinct) ζεύγη πόλη-περιοχή
        query = select(ParkingSpot.city, ParkingSpot.area).distinct().where(
            ParkingSpot.city != None,
            ParkingSpot.area != None
        )
        res = await self.db.execute(query)
        rows = res.all()

        # Εξάγουμε μοναδικές πόλεις, ταξινομημένες αλφαβητικά
        cities = sorted(list(set(r[0] for r in rows)))

        # Δημιουργούμε dictionary: πόλη → λίστα περιοχών
        areas: Dict[str, List[str]] = {city: [] for city in cities}
        for city, area in rows:
            if area not in areas[city]:
                areas[city].append(area)

        # Ταξινόμηση περιοχών αλφαβητικά
        for city in areas:
            areas[city].sort()

        return cities, areas

    async def search_spots(
        self,
        city: str,
        area: Optional[str] = None,
        is_free: Optional[bool] = None
    ) -> Optional[Tuple[int, float, float]]:
        """
        ΤΙ ΚΑΝΕΙ: Αναζητεί τη ΠΡΩΤΗ διαθέσιμη θέση που ταιριάζει στα κριτήρια.
        ΠΑΡΑΜΕΤΡΟΙ:
            city: η πόλη αναζήτησης (υποχρεωτικό)
            area: η περιοχή (προαιρετικό)
            is_free: True=μόνο δωρεάν, False=μόνο επί πληρωμή, None=όλα
        ΕΠΙΣΤΡΕΦΕΙ:
            (spot_id, latitude, longitude) αν βρεθεί
            None αν δεν βρεθεί
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για το Search Modal - ο χρήστης αναζητά και ο χάρτης "πετάει" εκεί.
        """
        # Αρχίζουμε με βασικό φίλτρο: πόλη ΚΑΙ διαθέσιμη κατάσταση
        query = select(
            ParkingSpot.id, ParkingSpot.latitude, ParkingSpot.longitude
        ).where(
            ParkingSpot.city == city,
            ParkingSpot.status == "Available"
        )

        # Προσθέτουμε φίλτρο περιοχής αν δόθηκε
        if area:
            query = query.where(ParkingSpot.area == area)

        # Φίλτρο δωρεάν/επί πληρωμή
        if is_free is not None:
            if is_free:
                # Δωρεάν = ΔΕΝ υπάρχει στον paid_parking πίνακα
                # outerjoin + WHERE NULL: βρες θέσεις ΔΕΝ είναι στο paid_parking
                query = query.outerjoin(PaidParking).where(PaidParking.spot_id == None)
            else:
                # Επί πληρωμή = ΥΠΑΡΧΕΙ στον paid_parking πίνακα
                query = query.join(PaidParking)

        # Παίρνουμε μόνο τη ΠΡΩΤΗ θέση
        query = query.limit(1)
        res = await self.db.execute(query)
        result = res.first()

        return result if result else None

    async def update_spot_status(self, spot_id: int, new_status: str) -> Optional[ParkingSpot]:
        """
        ΤΙ ΚΑΝΕΙ: Αλλάζει την κατάσταση μιας θέσης στη βάση ΚΑΙ στο Redis.
        ΠΑΡΑΜΕΤΡΟΙ:
            spot_id: το id της θέσης
            new_status: η νέα κατάσταση (π.χ. "Reserved", "Available")
        ΕΠΙΣΤΡΕΦΕΙ: Την ενημερωμένη θέση ή None.

        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
        - Από reservation_service.py όταν γίνεται κράτηση ("Reserved")
        - Όταν λήγει κράτηση ("Available")
        - Από admin για χειροκίνητη αλλαγή

        Ενημερώνει ΑΥΤΟΜΑΤΑ και το Redis (hash + status sets + GEO index).
        """
        spot = await self.db.get(ParkingSpot, spot_id)
        if not spot:
            return None

        # Κρατάμε την παλιά κατάσταση για να ενημερώσουμε σωστά τα Redis sets
        old_status = spot.status

        # Αλλάζουμε κατάσταση και ώρα ενημέρωσης
        spot.status = new_status
        spot.last_updated = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(spot)

        # Ενημερώνουμε το Redis για να αντικατοπτρίζεται αμέσως στον χάρτη
        try:
            # Ενημερώνουμε τα πεδία status και last_updated στο hash
            await redis_client.hset(f"spot:{spot_id}", mapping={
                "status": new_status,
                "last_updated": spot.last_updated.isoformat()
            })

            # Αφαιρούμε από το παλιό status set και προσθέτουμε στο νέο
            await redis_client.srem(f"spots:by_status:{old_status}", spot_id)
            await redis_client.sadd(f"spots:by_status:{new_status}", spot_id)

            # Ενημερώνουμε το GEO index
            # Αφαιρούμε από το παλιό GEO key
            await redis_client.zrem(f"spots:geo:{old_status}", f"spot_{spot_id}")

            # Προσθέτουμε στο νέο GEO key (αν έχει συντεταγμένες)
            if spot.longitude is not None and spot.latitude is not None:
                await redis_client.geoadd(
                    f"spots:geo:{new_status}",
                    float(spot.longitude), float(spot.latitude), f"spot_{spot_id}"
                )

        except Exception as e:
            logger.error(f"Failed to update Redis for spot {spot_id}: {e}")

        return spot
