"""
=======================================================================
mqtt_consumer.py - Λήψη Real-time Δεδομένων από Αισθητήρες Parking
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Χειρίζεται τα μηνύματα που έρχονται από αισθητήρες θέσεων parking
    μέσω του πρωτοκόλλου MQTT.

ΤΙ ΕΙΝΑΙ ΤΟ MQTT:
    MQTT = Message Queuing Telemetry Transport
    Είναι ένα ελαφρύ πρωτόκολλο επικοινωνίας σχεδιασμένο για IoT
    (Internet of Things = συσκευές αισθητήρων).

    Λειτουργεί με το μοντέλο "publisher/subscriber":
    - Αισθητήρας (publisher): Ανιχνεύει κατειλημμένη θέση → στέλνει "Occupied"
    - MQTT Broker (Mosquitto): Λαμβάνει και διανέμει τα μηνύματα
    - Αυτό το αρχείο (subscriber): "Ακούει" και επεξεργάζεται τα μηνύματα

ΡΟΗΛ ΔΕΔΟΜΕΝΩΝ:
    1. Αισθητήρας ανιχνεύει αλλαγή → δημοσιεύει στο topic:
       "parking/<city>/<spot_id>/status" με payload "Occupied"/"Available"
    2. MQTT Consumer (αυτό) λαμβάνει το μήνυμα
    3. Το μήνυμα μπαίνει σε "ουρά" (queue) για ασύγχρονη επεξεργασία
    4. Καταγράφεται αμέσως στο SpotStatusLog (ιστορικό)
    5. Μπαίνει σε "pending_updates" για ομαδική αποθήκευση
    6. ΑΜΕΣΩΣ ειδοποιούνται οι WebSocket clients (browser)
    7. Κάθε 5 δευτερόλεπτα: αποθήκευση στη βάση + Redis (batch)

ΓΙΑΤΙ BATCH ΑΠΟΘΗΚΕΥΣΗ:
    Αν έχουμε 1000 αισθητήρες που στέλνουν μηνύματα κάθε δευτερόλεπτο,
    1000 αποθηκεύσεις/sec στη βάση θα "έπεφτε" το σύστημα.
    Αντί αυτού, μαζεύουμε τις αλλαγές 5 δευτερολέπτων και τις
    αποθηκεύουμε μαζί (πολύ πιο αποδοτικό).

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    main.py (εκκίνηση), parking_repository.py (αποθήκευση),
    spot_status_log_repository.py (ιστορικό), WebSocket clients (frontend)
=======================================================================
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

from paho.mqtt.client import Client as MqttClient  # Βιβλιοθήκη MQTT client

from app.database import get_session, redis_client
from app.repositories.parking_repository import ParkingRepository
from app.repositories.spot_status_log_repository import SpotStatusLogRepository
from app.constants import VALID_SPOT_STATUSES, VALID_CITIES  # Έγκυρες τιμές

# Logger για καταγραφή συμβάντων
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.mqtt_consumer")


# =======================================================================
# GLOBAL ΜΕΤΑΒΛΗΤΕΣ
# =======================================================================

# pending_updates: Dictionary με τις εκκρεμείς αλλαγές προς αποθήκευση
# Κλειδί: spot_id (int), Τιμή: {"status": ..., "city": ..., "timestamp": ...}
# Μαζεύονται εδώ και αποθηκεύονται ομαδικά κάθε 5 δευτερόλεπτα
pending_updates: Dict[int, Dict] = {}

# batch_lock: "Κλείδωμα" που αποτρέπει ταυτόχρονη πρόσβαση στο pending_updates
# Χρειάζεται γιατί τόσο ο MQTT thread όσο και ο batch task το τροποποιούν
batch_lock = asyncio.Lock()

# websocket_clients: Λίστα με τους συνδεδεμένους WebSocket clients (browsers)
# Κάθε φορά που έρχεται MQTT μήνυμα, το στέλνουμε σε ΟΛΟΥΣ
websocket_clients: List = []


# =======================================================================
# ΚΛΑΣΗ: MQTTConsumer
# =======================================================================

class MQTTConsumer:
    """
    Κλάση που διαχειρίζεται τη σύνδεση MQTT και την επεξεργασία μηνυμάτων.

    ΑΡΧΙΤΕΚΤΟΝΙΚΗ:
    - Η βιβλιοθήκη paho-mqtt τρέχει σε ΞΕΧΩΡΙΣΤΟ thread (network thread)
    - Τα asyncio coroutines τρέχουν στο ΚΥΡΙΟ event loop
    - Χρησιμοποιούμε asyncio.Queue για ασφαλή επικοινωνία μεταξύ τους
    """

    def __init__(self):
        """
        ΤΙ ΚΑΝΕΙ: Αρχικοποίηση MQTT client και ουράς μηνυμάτων.
        """
        # Δημιουργούμε MQTT client (χρησιμοποιεί paho-mqtt βιβλιοθήκη)
        self.client = MqttClient()

        # message_queue: Ασφαλής ουρά μεταξύ του MQTT thread και asyncio
        # Ο MQTT thread βάζει μηνύματα (put), το asyncio τα παίρνει (get)
        self.message_queue: asyncio.Queue = asyncio.Queue()

        # loop: Το asyncio event loop - χρειάζεται για thread-safe επικοινωνία
        self.loop: Optional[asyncio.AbstractEventLoop] = None

    async def start(self):
        """
        ΤΙ ΚΑΝΕΙ: Εκκινεί τον MQTT consumer:
                   1. Αποθηκεύει το event loop
                   2. Ορίζει callbacks για σύνδεση/λήψη μηνυμάτων
                   3. Συνδέεται στον Mosquitto broker
                   4. Εκκινεί background tasks για επεξεργασία
        ΚΑΛΕΙΤΑΙ ΑΠΟ: main.py κατά την εκκίνηση της εφαρμογής
        """
        # Αποθηκεύουμε το τρέχον asyncio event loop
        # Χρειάζεται για να στέλνουμε μηνύματα από το MQTT thread
        self.loop = asyncio.get_running_loop()

        # --- Callback: Συμβαίνει όταν συνδεθούμε στον broker ---
        def on_connect(client, userdata, flags, rc):
            """
            ΤΙ ΚΑΝΕΙ: Εκτελείται αυτόματα όταν συνδεθούμε στον MQTT broker.
            ΠΑΡΑΜΕΤΡΟΙ: rc=0 σημαίνει επιτυχία, rc!=0 σημαίνει σφάλμα
            """
            if rc == 0:
                logger.info("Connected to MQTT broker")
                # Εγγραφόμαστε σε topics για κάθε πόλη
                # '+' = wildcard: οποιοδήποτε spot_id
                # Παράδειγμα: "parking/Athens/+/status" → λαμβάνει όλες τις Αθήνα
                for city in VALID_CITIES:
                    topic = f"parking/{city}/+/status"
                    client.subscribe(topic)
                    logger.info(f"Subscribed to {topic}")
            else:
                logger.error(f"Failed to connect, return code {rc}")

        # --- Callback: Συμβαίνει όταν λάβουμε MQTT μήνυμα ---
        def on_message(client, userdata, msg):
            """
            ΤΙ ΚΑΝΕΙ: Εκτελείται σε ΞΕΧΩΡΙΣΤΟ thread (paho network thread)
                       όταν φτάσει MQTT μήνυμα.
            ΣΗΜΑΝΤΙΚΟ: Δεν μπορούμε να χρησιμοποιήσουμε async/await εδώ!
                       Γι' αυτό χρησιμοποιούμε call_soon_threadsafe για να
                       "μεταφέρουμε" το μήνυμα στο asyncio event loop.
            """
            try:
                loop = self.loop
                if loop and loop.is_running():
                    # Ασφαλής μεταφορά μηνύματος από MQTT thread → asyncio loop
                    # put_nowait: βάζει στην ουρά χωρίς να περιμένει
                    loop.call_soon_threadsafe(self.message_queue.put_nowait, msg)
                else:
                    logger.error("Asyncio loop not set/running yet; dropping MQTT message")
            except Exception as e:
                logger.error(f"Failed to enqueue MQTT message: {e}")

        # Ορίζουμε τα callbacks στον MQTT client
        self.client.on_connect = on_connect
        self.client.on_message = on_message

        try:
            # Σύνδεση στον Mosquitto broker
            # "mosquitto": όνομα service στο docker-compose.yml
            # 1883: η standard πόρτα MQTT
            # 60: keepalive σε δευτερόλεπτα (ping κάθε 60s για να μείνει η σύνδεση)
            self.client.connect("mosquitto", 1883, 60)

            # Εκκίνηση paho network thread (τρέχει ξεχωριστά από asyncio)
            self.client.loop_start()
            logger.info("MQTT consumer started")

            # Εκκίνηση δύο background asyncio tasks:
            # 1. process_queue: επεξεργάζεται μηνύματα από την ουρά
            # 2. batch_update_task: αποθηκεύει αλλαγές κάθε 5 δευτερόλεπτα
            asyncio.create_task(self.process_queue())
            asyncio.create_task(self.batch_update_task())
        except Exception as e:
            logger.error(f"Failed to start MQTT consumer: {e}")

    async def process_queue(self):
        """
        ΤΙ ΚΑΝΕΙ: Διαβάζει συνεχώς μηνύματα από την ουρά και τα επεξεργάζεται.
        ΛΕΙΤΟΥΡΓΕΙ: Σε ατέρμονο βρόχο - τρέχει για όλη τη διάρκεια της εφαρμογής.
        ΣΗΜΑΝΤΙΚΟ: Το `await self.message_queue.get()` "κοιμάται" μέχρι να φτάσει
                   νέο μήνυμα - δεν σπαταλά CPU όσο η ουρά είναι άδεια.
        """
        while True:
            # Περιμένουμε το επόμενο μήνυμα (block μέχρι να υπάρξει)
            msg = await self.message_queue.get()
            try:
                await self.process_mqtt_message(msg)
            finally:
                # Σηματοδοτούμε ότι τελειώσαμε με αυτό το μήνυμα
                # (σημαντικό για σωστή λειτουργία της Queue)
                self.message_queue.task_done()

    async def process_mqtt_message(self, msg):
        """
        ΤΙ ΚΑΝΕΙ: Επεξεργάζεται ένα εισερχόμενο MQTT μήνυμα.
        ΠΑΡΑΜΕΤΡΟΙ: msg - το MQTT μήνυμα με topic και payload

        ΒΗΜΑΤΑ ΕΠΕΞΕΡΓΑΣΙΑΣ:
        1. Αποκωδικοποίηση topic → city + spot_id
        2. Αποκωδικοποίηση payload → status
        3. Επαλήθευση ότι city και status είναι έγκυρα
        4. Άμεση καταγραφή στο SpotStatusLog (ιστορικό)
        5. Προσθήκη στην ουρά batch updates
        6. Άμεση ειδοποίηση WebSocket clients

        FORMAT TOPIC: parking/<City>/<SpotId>/status
        Παράδειγμα:   parking/Athens/42/status  με payload "Occupied"
        """
        try:
            topic = msg.topic
            # Αποκωδικοποίηση bytes → string (UTF-8)
            payload_raw = msg.payload.decode("utf-8", errors="replace")
            logger.info(f"Received: {topic} -> {payload_raw}")

            # Διαχωρισμός topic: "parking/Athens/42/status" → ["parking", "Athens", "42", "status"]
            parts = topic.split("/")

            # Ελέγχουμε ότι το topic έχει τη σωστή δομή
            if len(parts) == 4 and parts[0] == "parking" and parts[3] == "status":
                city = parts[1]   # π.χ. "Athens"

                # Μετατροπή spot_id σε αριθμό
                try:
                    spot_id = int(parts[2])  # π.χ. "42" → 42
                except ValueError:
                    # Αν το spot_id δεν είναι αριθμός, αγνοούμε το μήνυμα
                    logger.warning(f"Invalid spot id in topic: {parts[2]}")
                    return

                # Το payload μπορεί να είναι:
                # - Απλό string: "Occupied" ή "Available"
                # - JSON: {"status": "Occupied", ...}
                status = payload_raw.strip()
                if status.startswith("{"):
                    # Προσπαθούμε να το αναλύσουμε ως JSON
                    try:
                        parsed = json.loads(status)
                        # Παίρνουμε το πεδίο "status" από το JSON
                        status = (parsed.get("status") or "").strip() or status
                    except Exception:
                        pass  # Αν αποτύχει, κρατάμε το αρχικό string

                # Επαλήθευση: η πόλη πρέπει να είναι στη λίστα VALID_CITIES
                if city not in VALID_CITIES:
                    logger.warning(f"Unsupported city: {city}")
                    return

                # Επαλήθευση: η κατάσταση πρέπει να είναι έγκυρη
                # (π.χ. "Available", "Occupied", "Reserved")
                if status not in VALID_SPOT_STATUSES:
                    logger.warning(f"Invalid status: {status}")
                    return

                # --- Άμεση καταγραφή στο SpotStatusLog ---
                # Κάθε αλλαγή κατάστασης καταγράφεται για ιστορικό/στατιστικά
                session = await get_session()
                try:
                    log_repo = SpotStatusLogRepository(session)
                    await log_repo.create_log(spot_id, status)
                except Exception as e:
                    logger.error(f"Error logging status change: {e}")
                finally:
                    await session.close()

                # --- Προσθήκη στις εκκρεμείς αλλαγές για batch αποθήκευση ---
                # async with batch_lock: αποτρέπει ταυτόχρονη τροποποίηση
                async with batch_lock:
                    pending_updates[spot_id] = {
                        "status": status,
                        "city": city,
                        "timestamp": datetime.now(),
                    }
                # Αν ο ίδιος spot_id εμφανιστεί ξανά πριν το batch,
                # αντικαθιστούμε την παλιά τιμή (κρατάμε μόνο την πιο πρόσφατη)

                # --- Άμεση ειδοποίηση WebSocket clients ---
                # Ενημερώνουμε τον χάρτη ΑΜΕΣΩΣ χωρίς να περιμένουμε το batch
                await self.broadcast_to_websockets(spot_id, status, city)

        except Exception as e:
            logger.error(f"Error processing message: {e}")

    async def batch_update_task(self):
        """
        ΤΙ ΚΑΝΕΙ: Κάθε 5 δευτερόλεπτα αποθηκεύει τις εκκρεμείς αλλαγές
                   στη βάση PostgreSQL ΚΑΙ στο Redis cache.
        ΛΕΙΤΟΥΡΓΕΙ: Σε ατέρμονο βρόχο για όλη τη διάρκεια της εφαρμογής.

        ΓΙΑΤΙ BATCH:
        Αντί να αποθηκεύουμε κάθε μήνυμα ΑΜΕΣΩΣ (1 query/μήνυμα),
        μαζεύουμε τις αλλαγές 5 δευτερολέπτων και τις αποθηκεύουμε μαζί.
        Αυτό μειώνει δραστικά το load στη βάση δεδομένων.

        REDIS ΕΝΗΜΕΡΩΣΗ:
        Για κάθε αλλαγή:
        1. Ενημέρωση του hash spot:{id} με τα νέα δεδομένα
        2. Προσθήκη στο set spots:by_status:{new_status}
        3. Αφαίρεση από το set spots:by_status:{old_status} (αν άλλαξε)
        4. GEO upsert: ενημέρωση τοποθεσίας στο spots:geo:{new_status}
        5. GEO removal: αφαίρεση από spots:geo:{old_status} (αν άλλαξε)
        """
        while True:
            try:
                # Περιμένουμε 5 δευτερόλεπτα πριν την επόμενη αποθήκευση
                await asyncio.sleep(5)

                # Παίρνουμε και αδειάζουμε τις εκκρεμείς αλλαγές (atomic)
                async with batch_lock:
                    if not pending_updates:
                        continue  # Δεν υπάρχουν αλλαγές - παραλείπουμε
                    updates_to_process = pending_updates.copy()
                    pending_updates.clear()

                # Ανοίγουμε σύνδεση με τη βάση για τις αποθηκεύσεις
                session = await get_session()
                try:
                    parking_repo = ParkingRepository(session)

                    # Επεξεργαζόμαστε κάθε αλλαγή
                    for spot_id, update_data in updates_to_process.items():
                        try:
                            # Παίρνουμε την τρέχουσα κατάσταση (για σύγκριση)
                            current_spot = await parking_repo.get_spot_by_id(spot_id)
                            old_status = current_spot.status if current_spot else None

                            # Ενημέρωση στη βάση PostgreSQL
                            updated_spot = await parking_repo.update_spot(
                                spot_id, status=update_data["status"]
                            )
                            if not updated_spot:
                                logger.warning(f"Spot {spot_id} not found")
                                continue

                            new_status = update_data["status"]
                            # Ελέγχουμε αν η κατάσταση πράγματι άλλαξε
                            # (αποφεύγουμε άσκοπες Redis λειτουργίες)
                            status_changed = (
                                old_status is not None and new_status != old_status
                            )

                            # --- Redis: Ενημέρωση hash με πλήρη δεδομένα ---
                            # hset: ορίζει πολλαπλά πεδία σε ένα hash αντικείμενο
                            # Το key είναι "spot:{spot_id}", π.χ. "spot:42"
                            await redis_client.hset(
                                f"spot:{spot_id}",
                                mapping={
                                    "id": str(spot_id),
                                    "latitude": "" if updated_spot.latitude is None else str(updated_spot.latitude),
                                    "longitude": "" if updated_spot.longitude is None else str(updated_spot.longitude),
                                    "location": updated_spot.location,
                                    "status": new_status,
                                    "last_updated": (
                                        updated_spot.last_updated.isoformat()
                                        if updated_spot.last_updated else ""
                                    ),
                                },
                            )

                            # --- Redis: Ενημέρωση Sets κατάστασης ---
                            # Προσθέτουμε σε νέο status set
                            await redis_client.sadd(f"spots:by_status:{new_status}", spot_id)
                            if status_changed:
                                # Αφαιρούμε από παλιό status set
                                await redis_client.srem(f"spots:by_status:{old_status}", spot_id)

                            # --- Redis GEO: Ενημέρωση γεωγραφικής θέσης ---
                            # Χρειάζεται για τις GEOSEARCH queries στο viewport
                            if updated_spot.longitude is not None and updated_spot.latitude is not None:
                                lon = float(updated_spot.longitude)
                                lat = float(updated_spot.latitude)

                                # GEOADD: Προσθέτει/ενημερώνει συντεταγμένες
                                # Format: GEOADD key longitude latitude member
                                await redis_client.execute_command(
                                    "GEOADD", f"spots:geo:{new_status}", lon, lat, f"spot_{spot_id}"
                                )

                                if status_changed:
                                    # ZREM: Αφαιρεί από το παλιό geo set
                                    # Τα GEO sets είναι εσωτερικά Sorted Sets στο Redis
                                    await redis_client.execute_command(
                                        "ZREM", f"spots:geo:{old_status}", f"spot_{spot_id}"
                                    )
                            else:
                                logger.warning(f"Spot {spot_id} missing coordinates; skipping GEO")

                            logger.info(
                                f"Updated spot {spot_id} in DB; cache upserted "
                                f"(status_changed={status_changed}, status={new_status})"
                            )

                        except Exception as e:
                            logger.error(f"Error updating spot {spot_id}: {e}")
                finally:
                    await session.close()  # ΠΑΝΤΑ κλείνουμε τη σύνδεση

            except Exception as e:
                logger.error(f"Error in batch update task: {e}")

    async def broadcast_to_websockets(self, spot_id: int, status: str, city: str):
        """
        ΤΙ ΚΑΝΕΙ: Στέλνει άμεση ειδοποίηση σε ΟΛΟΥΣ τους συνδεδεμένους browsers.
        ΠΑΡΑΜΕΤΡΟΙ:
            spot_id: ποια θέση άλλαξε
            status:  η νέα κατάσταση ("Available", "Occupied", κτλ.)
            city:    σε ποια πόλη βρίσκεται η θέση
        ΑΠΟΤΕΛΕΣΜΑ: Ο χάρτης στον browser αλλάζει χρώμα ΑΜΕΣΩΣ.

        ΑΣΦΑΛΕΙΑ:
        Αν ένας client αποσυνδεθεί (π.χ. έκλεισε τον browser), η αποστολή
        θα αποτύχει. Σε αυτή την περίπτωση, δεν τον προσθέτουμε ξανά
        στη λίστα (αφαιρείται αυτόματα).
        """
        if not websocket_clients:
            return  # Κανείς δεν είναι συνδεδεμένος - δεν κάνουμε τίποτα

        # Δημιουργούμε το μήνυμα που θα σταλεί στον browser
        message = {
            "type": "spot_update",      # Τύπος μηνύματος (το frontend το ελέγχει)
            "spot_id": spot_id,          # Ποια θέση αλλαξε
            "status": status,            # Νέα κατάσταση
            "city": city,                # Πόλη
            "timestamp": datetime.now().isoformat(),  # Πότε συνέβη
        }

        # Στέλνουμε σε κάθε connected client
        # Κρατάμε μόνο αυτούς που ΔΕΝ αποσυνδέθηκαν
        connected_clients = []
        for client in websocket_clients:
            try:
                await client.send_json(message)
                connected_clients.append(client)  # Επιτυχία: κρατάμε τον client
            except Exception as e:
                # Αποσύνδεση: αφαιρούμε τον client σιωπηλά
                logger.debug(f"Removed disconnected WebSocket client: {e}")

        # Αντικαθιστούμε τη λίστα με μόνο τους ενεργούς clients
        websocket_clients.clear()
        websocket_clients.extend(connected_clients)


# =======================================================================
# GLOBAL INSTANCE ΚΑΙ ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ
# =======================================================================

# Δημιουργούμε ένα μόνο instance του MQTTConsumer για ολόκληρη την εφαρμογή
# (Singleton pattern - μια μόνο σύνδεση MQTT)
mqtt_consumer = MQTTConsumer()


async def start_mqtt_consumer():
    """
    ΤΙ ΚΑΝΕΙ: Εκκινεί τον global MQTT consumer.
    ΚΑΛΕΙΤΑΙ ΑΠΟ: main.py κατά την εκκίνηση της εφαρμογής.
    """
    await mqtt_consumer.start()


def add_websocket_client(websocket):
    """
    ΤΙ ΚΑΝΕΙ: Προσθέτει νέο WebSocket client στη λίστα broadcast.
    ΚΑΛΕΙΤΑΙ ΑΠΟ: main.py όταν συνδέεται νέος browser.
    ΠΑΡΑΜΕΤΡΟΙ: websocket - το αντικείμενο σύνδεσης
    """
    websocket_clients.append(websocket)


def remove_websocket_client(websocket):
    """
    ΤΙ ΚΑΝΕΙ: Αφαιρεί WebSocket client όταν αποσυνδεθεί.
    ΚΑΛΕΙΤΑΙ ΑΠΟ: main.py όταν κλείσει ο browser.
    ΠΑΡΑΜΕΤΡΟΙ: websocket - το αντικείμενο σύνδεσης προς αφαίρεση
    """
    if websocket in websocket_clients:
        websocket_clients.remove(websocket)
