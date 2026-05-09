"""
=======================================================================
main.py - Κεντρικό Αρχείο Εκκίνησης της Εφαρμογής
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Είναι το "κεντρικό σημείο εκκίνησης" (entry point) του backend.
    Εδώ γίνεται:
    1. Δημιουργία της κύριας FastAPI εφαρμογής
    2. Αρχικοποίηση βάσης δεδομένων, Redis cache, MQTT consumer
    3. Ρύθμιση CORS (επικοινωνία με το React frontend)
    4. Ορισμός WebSocket endpoint για real-time ενημερώσεις
    5. Εγγραφή όλων των routers (user, parking, reservation, κτλ.)

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Κάθε FastAPI εφαρμογή χρειάζεται ένα κεντρικό αρχείο που:
    - Δημιουργεί το app αντικείμενο
    - Συνδέει όλα τα επιμέρους τμήματα (routers, middleware)
    - Εκτελεί ενέργειες εκκίνησης και τερματισμού

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Ο Uvicorn (web server) εκκινεί πάντα από αυτό το αρχείο:
    `uvicorn app.main:app --reload`

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    database.py, mqtt_consumer.py, όλοι οι routers
=======================================================================
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app import models
from app.routers.user_router import router as user_router
from app.routers.parking_router import router as parking_router
from app.routers.spot_status_log_router import router as spot_status_log_router
from app.routers.reservation_router import router as reservation_router
from app.mqtt_consumer import start_mqtt_consumer, add_websocket_client, remove_websocket_client
from app.database import get_session, redis_client
import logging

# Logger για αυτό το module - εμφανίζει μηνύματα με prefix "app.main"
logger = logging.getLogger(__name__)


# =======================================================================
# LIFESPAN: Ενέργειες Εκκίνησης και Τερματισμού
# =======================================================================
# Το @asynccontextmanager decorator φτιάχνει ένα "context" που:
#   - Εκτελεί κώδικα ΠΡΙΝ από το yield όταν η εφαρμογή ξεκινά
#   - Εκτελεί κώδικα ΜΕΤΑ από το yield όταν η εφαρμογή σταματά
# Έτσι χειριζόμαστε initialization και cleanup σε ένα μέρος.

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    ΤΙ ΚΑΝΕΙ: Διαχειρίζεται τον κύκλο ζωής της εφαρμογής.
    ΕΚΚΙΝΗΣΗ (πριν yield): Βάση δεδομένων → Redis cache → MQTT consumer
    ΤΕΡΜΑΤΙΣΜΟΣ (μετά yield): Καθαρισμός πόρων (logging)

    ΣΗΜΑΝΤΙΚΟ: Αν κάποιο βήμα αποτύχει, η εφαρμογή συνεχίζει
    (try/except) αλλά καταγράφει το σφάλμα. Δεν θέλουμε να
    "πέσει" ολόκληρη η εφαρμογή αν το Redis δεν είναι έτοιμο.
    """
    # --- ΒΗΜΑ 1: Δημιουργία πινάκων βάσης δεδομένων ---
    # Αν οι πίνακες δεν υπάρχουν, δημιουργούνται αυτόματα από τα models
    await init_db()
    logger.info("Database initialized")

    # --- ΒΗΜΑ 2: Προφόρτωση θέσεων στο Redis cache ---
    # Φορτώνουμε όλες τις θέσεις από PostgreSQL → Redis
    # Έτσι τα πρώτα requests θα βρουν δεδομένα στο cache (γρήγορη απόκριση)
    session = await get_session()  # Ανοίγουμε σύνδεση με τη βάση
    try:
        from app.repositories.parking_repository import ParkingRepository
        repo = ParkingRepository(session)
        await repo.preload_spots_to_cache()  # Φόρτωση στο Redis
        logger.info("Redis cache preload successful")
    except Exception as e:
        # Αν το Redis δεν είναι διαθέσιμο, η εφαρμογή συνεχίζει χωρίς cache
        logger.error(f"Failed to preload Redis cache: {e}")
    finally:
        await session.close()  # ΠΑΝΤΑ κλείνουμε τη σύνδεση

    # --- ΒΗΜΑ 3: Εκκίνηση MQTT Consumer ---
    # Ξεκινά να "ακούει" μηνύματα από τους αισθητήρες parking
    # Αν αποτύχει (π.χ. ο Mosquitto broker δεν τρέχει), συνεχίζουμε
    try:
        await start_mqtt_consumer()
        logger.info("MQTT consumer started successfully")
    except Exception as e:
        logger.error(f"Failed to start MQTT consumer: {e}")

    # yield: Η εφαρμογή τρέχει εδώ - όταν τελειώσει, συνεχίζει παρακάτω
    yield

    # --- ΤΕΡΜΑΤΙΣΜΟΣ ---
    # Εδώ θα μπαίναν ενέργειες καθαρισμού (π.χ. κλείσιμο συνδέσεων)
    logger.info("Shutting down...")


# =======================================================================
# ΔΗΜΙΟΥΡΓΙΑ FastAPI ΕΦΑΡΜΟΓΗΣ
# =======================================================================
# Δημιουργούμε το κεντρικό app αντικείμενο.
# lifespan=lifespan: ορίζει τις ενέργειες εκκίνησης/τερματισμού
# title: εμφανίζεται στο Swagger UI (/docs)

app = FastAPI(lifespan=lifespan, title="Smart Parking API")


# =======================================================================
# CORS MIDDLEWARE: Επικοινωνία Frontend-Backend
# =======================================================================
# CORS (Cross-Origin Resource Sharing) = μηχανισμός ασφαλείας του browser.
#
# ΠΡΟΒΛΗΜΑ ΧΩΡΙΣ CORS:
#   Το React frontend τρέχει στο http://localhost:5173
#   Το FastAPI backend τρέχει στο http://localhost:8000
#   Ο browser θεωρεί αυτά "διαφορετικές προελεύσεις" (different origins)
#   και ΑΡΝΕΙΤΑΙ να επικοινωνήσει μεταξύ τους για λόγους ασφαλείας.
#
# ΛΥΣΗ: Λέμε στον server να επιτρέπει requests από το localhost:5173

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Επιτρέπουμε μόνο το frontend μας
    allow_credentials=True,   # Επιτρέπουμε cookies/authorization headers
    allow_methods=["*"],      # Επιτρέπουμε GET, POST, PUT, DELETE, κτλ.
    allow_headers=["*"],      # Επιτρέπουμε όλα τα headers (π.χ. Authorization)
)


# =======================================================================
# WEBSOCKET ENDPOINT: Real-time Ενημερώσεις
# =======================================================================
# WebSocket = μόνιμη αμφίδρομη σύνδεση μεταξύ browser και server.
#
# ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ:
# 1. Frontend ανοίγει σύνδεση: new WebSocket("ws://localhost:8000/ws")
# 2. Server αποδέχεται τη σύνδεση και προσθέτει τον client στη λίστα
# 3. Όταν ένας αισθητήρας αλλάξει κατάσταση (MQTT), το backend
#    στέλνει μήνυμα σε ΟΛΟΥΣ τους συνδεδεμένους clients ταυτόχρονα
# 4. Ο χάρτης ενημερώνεται ΑΜΕΣΩΣ χωρίς ο χρήστης να κάνει refresh
#
# ΔΙΑΦΟΡΑ HTTP vs WebSocket:
# HTTP:      Client → Request → Server → Response → Τέλος
# WebSocket: Client ↔ Ανοιχτή σύνδεση ↔ Server (συνεχής επικοινωνία)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    ΤΙ ΚΑΝΕΙ: Διαχειρίζεται WebSocket συνδέσεις για real-time updates.
    ΠΑΡΑΜΕΤΡΟΙ: websocket - το αντικείμενο σύνδεσης (δίνεται αυτόματα από FastAPI)
    ΕΠΙΣΤΡΕΦΕΙ: Δεν επιστρέφει - τρέχει συνεχώς μέχρι αποσύνδεση
    """
    # Αποδεχόμαστε τη σύνδεση (handshake)
    await websocket.accept()

    # Προσθέτουμε τον client στη λίστα για να λαμβάνει updates
    add_websocket_client(websocket)
    logger.info(f"WebSocket client connected: {websocket.client}")

    try:
        # Μένουμε σε βρόχο - διαβάζουμε τυχόν μηνύματα από τον client
        # Αυτό κρατά τη σύνδεση ζωντανή (δεν χρειάζεται ο client να στέλνει κάτι)
        while True:
            data = await websocket.receive_text()  # Αναμένουμε μήνυμα
            # Echo: στέλνουμε πίσω ό,τι λάβαμε (για debugging/ping)
            await websocket.send_json({"type": "echo", "message": data})

    except WebSocketDisconnect:
        # Ο client έκλεισε τη σύνδεση (π.χ. έκλεισε τον browser)
        logger.info(f"WebSocket client disconnected: {websocket.client}")
    except Exception as e:
        # Απροσδόκητο σφάλμα (π.χ. δίκτυο)
        logger.error(f"WebSocket error: {e}")
    finally:
        # ΠΑΝΤΑ αφαιρούμε τον client από τη λίστα (αποσυνδέθηκε)
        remove_websocket_client(websocket)


# =======================================================================
# ΕΓΓΡΑΦΗ ROUTERS
# =======================================================================
# Κάθε router "ξέρει" για ένα σύνολο endpoints (π.χ. /users/...).
# include_router() τους συνδέει με το κεντρικό app.
# prefix="/api" σημαίνει ότι όλα τα URLs ξεκινούν με /api
# π.χ. user_router με prefix /users → τελικό URL: /api/users/...

app.include_router(user_router, prefix="/api")           # /api/users/...
app.include_router(parking_router, prefix="/api")        # /api/parking/...
app.include_router(spot_status_log_router, prefix="/api") # /api/logs/...
app.include_router(reservation_router, prefix="/api")    # /api/reservations/...


# =======================================================================
# ENDPOINT: Health Check
# =======================================================================
@app.get("/")
async def root():
    """
    ΤΙ ΚΑΝΕΙ: Επαλήθευση ότι ο server τρέχει σωστά.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για να ελέγξουμε γρήγορα αν το backend είναι online.
    ΕΠΙΣΤΡΕΦΕΙ: Μήνυμα επιβεβαίωσης.
    """
    return {"message": "Smart Parking Backend Running!"}
