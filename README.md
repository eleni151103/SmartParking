# 🅿️ Smart Parking System

A real-time smart parking application that helps users find and reserve available parking spots in their city.

## 📋 Overview

Smart Parking is a full-stack web application that provides:
- **Real-time parking spot availability** via WebSocket updates
- **Interactive map** showing parking spots with color-coded status
- **Search functionality** to find parking by city and area
- **User authentication** with login and registration (JWT-based)
- **Favorites** system to save preferred parking spots
- **Reservation** system to temporarily hold a spot
- **Admin Dashboard** for managing parking spots and pricing
- **Frontend Gatekeeper** to protect map access

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React/Vite    │◄────│   FastAPI        │◄────│   PostgreSQL    │
│   Frontend      │     │   Backend        │     │   Database      │
│   (Port 5173)   │     │   (Port 8000)    │     │   (Port 5432)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │ ▲
                               │ │
                   ┌───────────┘ └───────────┐
                   ▼                         │
         ┌─────────────────┐     ┌─────────────────┐
         │   Mosquitto     │     │   Redis         │
         │   MQTT Broker   │     │   Cache         │
         │   (Port 1883)   │     │   (Port 6379)   │
         └─────────────────┘     └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for development server
- Leaflet for interactive maps
- TailwindCSS for styling

**Backend:**
- FastAPI (Python) for REST API
- JSON Web Tokens (JWT) for secure authentication
- SQLAlchemy for database ORM
- Paho-MQTT for real-time sensor data
- Redis for caching (cache-aside pattern)

**Infrastructure:**
- PostgreSQL database
- Redis for caching
- Mosquitto MQTT broker
- Docker Compose for orchestration

## 📁 Project Structure

```
Smart_Parking_PY/
├── docker-compose.yml      # Container orchestration
├── README.md               # This file
│
├── backend/
│   ├── Dockerfile          # Backend container config
│   ├── requirements.txt    # Python dependencies
│   ├── start.sh           # Startup script
│   └── app/
│       ├── main.py         # FastAPI entry point
│       ├── database.py     # DB & Redis configuration
│       ├── models.py       # SQLAlchemy ORM models
│       ├── constants.py    # App constants
│       ├── mqtt_consumer.py # Real-time sensor handler
│       ├── routers/        # API endpoints
│       ├── services/       # Business logic
│       ├── repositories/   # Data access layer
│       └── dtos/           # Request/Response schemas
│
└── frontend/
    ├── Dockerfile          # Frontend container config
    ├── package.json        # Node dependencies
    └── src/
        ├── App.tsx         # Auth Gatekeeper (MainLayout vs LandingPage)
        ├── main.tsx        # React entry point & 404 Routing
        ├── components/     # UI components
        ├── hooks/          # Custom React hooks
        ├── contexts/       # React contexts (Auth, Favorites)
        ├── services/       # API services
        ├── utils/          # Utility functions
        └── types/          # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- **Docker** and **Docker Compose** installed
- No other services running on ports: 5432, 6379, 8080, 1883, 8000, 5173

### Running the Application

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Smart_Parking_PY
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Redis Insight (optional): http://localhost:8080

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Development Mode

For local development without Docker:

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> Note: You'll need PostgreSQL, Redis, and Mosquitto running locally.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parking/spots` | Get all parking spots |
| GET | `/api/parking/spots/in_viewport` | Get spots within map bounds |
| GET | `/api/parking/search` | Search for available spots |
| GET | `/api/parking/locations` | Get cities and areas |
| POST | `/api/users/login` | User login (returns JWT) |
| POST | `/api/users/` | User registration |
| POST | `/api/reservations/` | Create a reservation |
| POST | `/api/parking/spots` | Create new spot (Admin) |
| PUT | `/api/parking/spots/{id}` | Update spot settings (Admin) |
| DELETE | `/api/parking/spots/{id}` | Delete a spot (Admin) |
| WebSocket | `/ws` | Real-time spot updates |

## 🔄 Real-time Updates

The system receives real-time parking spot updates via MQTT:

1. **Sensors** publish status changes to Mosquitto broker
2. **MQTT Consumer** receives messages and updates database
3. **WebSocket** broadcasts changes to connected frontend clients
4. **Map** updates markers instantly without refresh

MQTT Topic format: `parking/<city>/<spot_id>/status`

## 🗄️ Database Schema

- **ParkingSpot** - Location and status of each parking spot
- **SpotStatusLog** - Historical record of status changes
- **User** - Registered user accounts
- **UserFavorites** - User's saved favorite spots
- **Reservation** - Active parking reservations
- **PaidParking** - Pricing for paid spots

## 🎨 Features

### Map View
- Interactive Leaflet map centered on user location
- Color-coded markers (green=available, gray=occupied, gold=favorite)
- Click markers to see details and reserve

### Sidebar
- Lists available spots sorted by distance
- Filter by: All / Free / Paid
- Shows spot count and nearest spot distance

### Search
- Search by city and area
- Filter free or paid spots
- Map flies to search result

### User Features
- **Secure Login/Registration**: JWT-based auth with auto-redirects.
- **Landing Page**: Dedicated entry point for unauthenticated users.
- **Save favorite spots**: Keep track of best parking locations.
- **Reserve spots**: 30-second hold for testing (authenticated only).

### Admin Dashboard (`/admin`)
- **Protected Route**: Only accessible to users with `is_admin=True`.
- **Manage Spots**: Create, update, and delete parking spots.
- **Search & Filter**: Real-time filtering of spots by location, city, or area.
- **Paid Parking**: Toggle spots as "Paid" and set hourly rates.
- **Status Management**: Monitor and manually update spot status.

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | See docker-compose |
| `REDIS_HOST` | Redis hostname | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `VITE_API_BASE` | Backend API URL | `http://localhost:8000/api` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:8000/ws` |

## 📄 License

This project was created for educational purposes.
