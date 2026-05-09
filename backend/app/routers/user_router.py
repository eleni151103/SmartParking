"""
=======================================================================
user_router.py - HTTP Endpoints Χρηστών
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Ορίζει τα HTTP endpoints (URLs) που αφορούν χρήστες.
    Κάθε @router.xxx() decorator ορίζει ένα endpoint.

ΤΕΛΙΚΑ URLs (με prefix /api):
    POST   /api/users/login               → Login χρήστη
    POST   /api/users/                    → Εγγραφή νέου χρήστη
    GET    /api/users/                    → Λήψη όλων χρηστών (requires login)
    GET    /api/users/{id}                → Λήψη συγκεκριμένου χρήστη
    PUT    /api/users/{id}                → Ενημέρωση χρήστη (μόνο ο ίδιος)
    DELETE /api/users/{id}                → Διαγραφή χρήστη (μόνο ο ίδιος)
    POST   /api/users/{id}/favorites/{sid} → Προσθήκη αγαπημένου
    DELETE /api/users/{id}/favorites/{sid} → Αφαίρεση αγαπημένου
    GET    /api/users/{id}/favorites      → Λήψη αγαπημένων

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Κάθε "ομάδα" endpoints έχει το δικό του router για καλύτερη οργάνωση.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Σε κάθε HTTP request από το frontend (login, εγγραφή, αγαπημένα).

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    user_service.py (business logic), deps.py (authentication check),
    user_dto.py (request/response validation)
=======================================================================
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.user_service import UserService
from app.repositories.user_repository import UserRepository
from app.dtos.user_dto import UserCreate, UserUpdate, UserResponse, UserLogin, LoginResponse
from app.core.security import create_access_token  # Για δημιουργία JWT token
from app.core.deps import get_current_user  # Για έλεγχο αν είναι συνδεδεμένος
from app.models import User

# Δημιουργούμε router με prefix /users
# Όλα τα endpoints εδώ θα έχουν URL που ξεκινά με /users
# tags=["users"]: ομαδοποίηση στη διαδραστική τεκμηρίωση (Swagger UI)
router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί και επιστρέφει ένα UserService.
    ΓΙΑΤΙ: Κάθε request χρειάζεται νέο service με νέο db session.
    Αυτό γίνεται αυτόματα μέσω Depends() - dependency injection.
    """
    repo = UserRepository(db)  # Δημιουργούμε repository με τη σύνδεση βάσης
    return UserService(repo)   # Δημιουργούμε service με το repository


# =======================================================================
# ENDPOINT: Login
# =======================================================================
@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, service: UserService = Depends(get_user_service)):
    """
    ΤΙ ΚΑΝΕΙ: Κάνει login έναν χρήστη.
    ΠΑΡΑΜΕΤΡΟΙ: credentials - email + password από το body του request
    ΕΠΙΣΤΡΕΦΕΙ: JWT token + πληροφορίες χρήστη
    ΣΦΑΛΜΑ 401: Αν τα στοιχεία είναι λάθος

    ΡΟΗΛ ΕΚΤΕΛΕΣΗΣ:
    1. Λαμβάνει email και password από το request
    2. Καλεί service.login() για επαλήθευση
    3. Δημιουργεί JWT token για τον χρήστη
    4. Επιστρέφει token + πληροφορίες χρήστη
    """
    try:
        # Επαλήθευση στοιχείων
        user = await service.login(credentials.email, credentials.password)

        # Δημιουργία JWT token με το user.id ως subject
        access_token = create_access_token(subject=user.id)

        return {
            "access_token": access_token,
            "token_type": "bearer",  # Τύπος token (πάντα "bearer")
            "user": user
        }
    except ValueError as e:
        # Λάθος στοιχεία → 401 Unauthorized
        raise HTTPException(status_code=401, detail=str(e))


# =======================================================================
# ENDPOINT: Λήψη Όλων Χρηστών (Protected)
# =======================================================================
@router.get("/", response_model=list[UserResponse])
async def get_all_users(
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)  # Απαιτεί σύνδεση
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει όλους τους χρήστες.
    ΠΡΟΣΤΑΤΕΥΜΕΝΟ: Μόνο για συνδεδεμένους χρήστες.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Από admin.
    """
    return await service.get_all_users()


# =======================================================================
# ENDPOINT: Λήψη Συγκεκριμένου Χρήστη
# =======================================================================
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει έναν συγκεκριμένο χρήστη.
    ΠΑΡΑΜΕΤΡΟΙ: user_id - από το URL (π.χ. /api/users/5)
    ΣΦΑΛΜΑ 404: Αν ο χρήστης δεν βρεθεί.
    """
    try:
        return await service.get_user_by_id(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Εγγραφή Νέου Χρήστη (Δημόσιο)
# =======================================================================
@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, service: UserService = Depends(get_user_service)):
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί νέο λογαριασμό χρήστη.
    ΠΑΡΑΜΕΤΡΟΙ: user - email + password + full_name από body
    ΔΗΜΟΣΙΟ: Δεν απαιτεί authentication (κάποιος πρέπει να μπορεί να εγγραφεί!)
    ΕΠΙΣΤΡΕΦΕΙ: Τα στοιχεία του νέου χρήστη (χωρίς κωδικό).
    """
    return await service.create_user(user.email, user.password, user.full_name)


# =======================================================================
# ENDPOINT: Ενημέρωση Χρήστη
# =======================================================================
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    updates: UserUpdate,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Ενημερώνει τα στοιχεία ενός χρήστη.
    ΚΑΝΟΝΑΣ ΑΣΦΑΛΕΙΑΣ: Μόνο ο ίδιος ο χρήστης μπορεί να αλλάξει τα στοιχεία του.
    ΣΦΑΛΜΑ 403: Αν ένας χρήστης προσπαθεί να αλλάξει στοιχεία ΑΛΛΟΥ χρήστη.
    """
    try:
        # Ελέγχουμε αν ο τρέχων χρήστης ενημερώνει τον ΕΑΥΤΟ ΤΟΥ
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this user")

        return await service.update_user(user_id, **updates.dict(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Διαγραφή Χρήστη
# =======================================================================
@router.delete("/{user_id}", response_model=UserResponse)
async def delete_user(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Διαγράφει έναν χρήστη.
    ΚΑΝΟΝΑΣ ΑΣΦΑΛΕΙΑΣ: Μόνο ο ίδιος μπορεί να διαγράψει τον εαυτό του.
    """
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this user")
        return await service.delete_user(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Προσθήκη Αγαπημένου
# =======================================================================
@router.post("/{user_id}/favorites/{spot_id}")
async def add_favorite(
    user_id: int,
    spot_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Προσθέτει θέση στα αγαπημένα χρήστη.
    ΠΑΡΑΜΕΤΡΟΙ: user_id και spot_id από το URL.
    ΚΑΝΟΝΑΣ: Μόνο ο ίδιος μπορεί να αλλάξει τα αγαπημένα του.
    ΕΠΙΣΤΡΕΦΕΙ: Μήνυμα επιτυχίας.
    """
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        await service.add_favorite(user_id, spot_id)
        return {"message": "Favorite added"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =======================================================================
# ENDPOINT: Αφαίρεση Αγαπημένου
# =======================================================================
@router.delete("/{user_id}/favorites/{spot_id}")
async def remove_favorite(
    user_id: int,
    spot_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Αφαιρεί θέση από τα αγαπημένα χρήστη.
    ΚΑΝΟΝΑΣ: Μόνο ο ίδιος μπορεί να αλλάξει τα αγαπημένα του.
    """
    try:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        await service.remove_favorite(user_id, spot_id)
        return {"message": "Favorite removed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =======================================================================
# ENDPOINT: Λήψη Αγαπημένων
# =======================================================================
@router.get("/{user_id}/favorites", response_model=list[int])
async def get_favorites(
    user_id: int,
    service: UserService = Depends(get_user_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει τα IDs των αγαπημένων θέσεων ενός χρήστη.
    ΕΠΙΣΤΡΕΦΕΙ: Λίστα αριθμών π.χ. [3, 7, 15]
    ΚΑΝΟΝΑΣ: Μόνο ο ίδιος μπορεί να δει τα αγαπημένα του.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await service.get_favorites(user_id)
