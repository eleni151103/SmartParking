# Database Usage Report: Smart Parking System

This report provides a detailed overview of the database schema, including table definitions, fields, indexes, and their usage within the Smart Parking application (both Backend and Frontend).

---

## 1. Table: `parking_spots`
This is the core table of the application, storing information about individual parking spaces.

### Schema & Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL` (PK) | Unique identifier for each parking spot. |
| `latitude` | `DOUBLE PRECISION` | Geographic latitude for map positioning. |
| `longitude` | `DOUBLE PRECISION` | Geographic longitude for map positioning. |
| `location` | `VARCHAR(100)` | Human-readable address or descriptive name (e.g., "Athens - Syntagma Square"). |
| `city` | `VARCHAR(50)` | The city where the spot is located (e.g., "Athens", "Larissa"). |
| `area` | `VARCHAR(50)` | The specific neighborhood or district (e.g., "Kolonaki", "Plaka"). |
| `status` | `VARCHAR(20)` | Current state: `'Available'`, `'Occupied'`, or `'Reserved'`. |
| `last_updated`| `TIMESTAMP` | Auto-updated timestamp of the last status or info change. |

### Indexes
- `idx_parking_spots_city_area`: Composite index on `(city, area)` for optimized search by location.
- `idx_parking_spots_status`: Index on `status` to quickly filter available spots.
- `idx_parking_spots_location`: Index on `location` for text-based searches.
- `idx_spots_bbox`: B-Tree index on `(latitude, longitude)` for spatial/viewport queries.
- `idx_spots_bbox_status`: Composite index on `(status, latitude, longitude)` for optimized filtering of available spots within a map view.

### Usage
- **Backend**: Managed via `ParkingRepository` and `ParkingService`. Used in `parking_router.py` for CRUD operations, viewport filtering (`/parking/spots/in_viewport`), and status updates.
- **Frontend**: Displayed on the main map using `useViewportSpots.ts` and `useLiveSpots.ts`. Managed by admins in the `AdminDashboard.tsx`.

---

## 2. Table: `users`
Stores registered user accounts and administrative privileges.

### Schema & Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL` (PK) | Unique identifier for the user. |
| `email` | `VARCHAR(100)` | Unique email used for login. |
| `password_hash`| `TEXT` | Bcrypt hashed password for security. |
| `full_name` | `VARCHAR(100)` | User's display name. |
| `is_admin` | `BOOLEAN` | Flag for administrative access (Default: `FALSE`). |
| `created_at` | `TIMESTAMP` | Timestamp when the account was created. |

### Usage
- **Backend**: Handled by `UserRepository`. Used for authentication (JWT), user profile management, and checking admin rights in `user_router.py`.
- **Frontend**: Used during Login/Register and for conditionally rendering the Admin Dashboard.

---

## 3. Table: `reservations`
Tracks active and historical parking spot reservations made by users.

### Schema & Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL` (PK) | Unique reservation ID. |
| `user_id` | `INTEGER` (FK) | Reference to `users.id`. |
| `spot_id` | `INTEGER` (FK) | Reference to `parking_spots.id`. |
| `start_time` | `TIMESTAMP` | When the reservation begins. |
| `end_time` | `TIMESTAMP` | When the reservation ends (NULL if still active). |

### Usage
- **Backend**: Managed by `ReservationRepository`. When a reservation is created, it triggers a status change in `parking_spots` to `'Reserved'`.
- **Frontend**: Users can view their active reservations and book new ones via the spot details modal.

---

## 4. Table: `user_favorites`
A junction table for the many-to-many relationship between users and their favorite parking spots.

### Schema & Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `user_id` | `INTEGER` (PK, FK)| Reference to `users.id`. |
| `spot_id` | `INTEGER` (PK, FK)| Reference to `parking_spots.id`. |

### Usage
- **Backend**: `UserFavoritesRepository` handles additions and removals.
- **Performance**: Favorites are mirrored in **Redis** (`user:{id}:favorites`) for near-instant lookup during map rendering.

---

## 5. Table: `spot_status_log`
Historical log of every status change for every parking spot. Used for analytics and tracking.

### Schema & Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL` (PK) | Unique log entry ID. |
| `spot_id` | `INTEGER` (FK) | Reference to `parking_spots.id`. |
| `status` | `VARCHAR(20)` | The status the spot changed to. |
| `timestamp` | `TIMESTAMP` | When the change occurred. |

### Usage
- **Backend**: Automatically updated via `ParkingService` whenever a spot's status is modified (e.g., via IoT sensor/MQTT or manual admin action).

---

## 6. Table: `paid_parking`
Stores pricing information for specific parking spots that are not free.

### Schema & Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `spot_id` | `INTEGER` (PK, FK)| Reference to `parking_spots.id`. |
| `price_per_hour`| `NUMERIC(8,2)` | Hourly rate for the spot. |

### Indexes
- `idx_paid_parking_price`: Index on `price_per_hour` for filtering by cost.

### Usage
- **Backend**: Joined with `parking_spots` in queries to provide full spot details including pricing.
- **Frontend**: Displayed as a "Premium" or "Paid" badge on the map markers and in the info panel.
