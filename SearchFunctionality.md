# Search Functionality Documentation

This document outlines the implementation of the parking spot search functionality, explaining the design choices and the overall workflow from the backend to the frontend.

## 1. Backend Implementation

The core idea was to create a structured and efficient way to search for parking spots, rather than relying on simple text matching. This led to a few key changes:

### Database Schema (`ops/ps-init.sql`)

-   **New Columns:** I added `city` (e.g., "Athens") and `area` (e.g., "Syntagma Square") columns to the `parking_spots` table.
-   **Why this approach?**
    -   **Reliability:** Directly querying structured data is far more reliable than parsing a free-text `location` string, which could have inconsistent formatting.
    -   **Filtering:** It allows for precise filtering on the backend.
    -   **Scalability:** This design makes it easy to add more cities or areas in the future without changing the query logic.
-   **Indexing:** A new database index `idx_parking_spots_city_area` was created on the `(city, area)` columns to ensure that search queries are fast and efficient, even as the number of parking spots grows.

### API Endpoints (`backend/app/routers/parking_router.py`)

Two new endpoints were created to support the search feature:

1.  `GET /api/parking/locations`
    -   **Purpose:** To provide the frontend with a structured list of all distinct cities and the areas within each city.
    -   **How it works:** It queries the database for all unique, non-null `(city, area)` pairs and returns them. This allows the frontend search modal to dynamically populate its dropdown menus without hardcoding any locations.

2.  `GET /api/parking/search`
    -   **Purpose:** To find a single, available parking spot that matches the user's criteria.
    -   **Parameters:**
        -   `city` (string, required)
        -   `area` (string, required)
        -   `is_free` (boolean, optional): Filters for free (`true`) or paid (`false`) spots. If omitted, it searches for both.
    -   **How it works:** This endpoint searches for a spot that meets all the filter criteria **and has a status of "Available"**. It returns the coordinates of the *first* matching spot it finds.

### The "No Available Spots" Logic

A crucial part of the design is how the search handles cases where no spots are available.

-   When a user performs a search, the backend looks for a spot that is **currently available**.
-   If all spots in the selected area are `Occupied`, `Reserved`, or otherwise unavailable, the query will find no results.
-   Similarly, if the user filters for "Free" parking, but the only available spots in that area are "Paid," the query will also find no results.
-   In these scenarios, the backend correctly returns a **404 Not Found** HTTP status with the error message "No available spots found for the selected criteria."
-   This is intentional. It prevents the user from being navigated to an area where there are no usable parking spots, which would be a frustrating user experience. The frontend then catches this specific error and displays a helpful message to the user in the search modal.

## 2. Frontend Implementation

The frontend was updated to provide a clean user interface for the new search capabilities.

### UI Components

1.  **Header (`Header.tsx`):**
    -   The trigger for the search functionality was moved from a static search bar on the map to a more intuitive **search icon** in the main header. This cleans up the map view and follows a more standard UI pattern.

2.  **Search Modal (`SearchModal.tsx`):**
    -   A new, modern search modal was created. It has been styled for both light and dark modes.
    -   On opening, it calls the `/api/parking/locations` endpoint to dynamically populate the "City" and "Area" dropdowns.
    -   When the user clicks "Search," it constructs a query to the `/api/parking/search` endpoint with the selected filters.
    -   It handles both success and error responses from the backend, showing an error message to the user if no available spots are found.

### Map Interaction (`MapView.tsx` & `App.tsx`)

The most complex part of the frontend implementation was ensuring a smooth "fly-to" animation without locking the map.

-   **The Problem:** A naive implementation would cause the map to "shake" or get stuck, as it would try to re-animate the flight on every map movement.
-   **The Solution:**
    1.  When a search is successful, `SearchModal` passes the resulting coordinates up to the main `App.tsx` component, which stores them in a `searchResult` state variable.
    2.  This `searchResult` is passed as a prop to the `MapView` component.
    3.  Inside `MapView`, a special `FlyTo` component is rendered *only* when `searchResult` is not null.
    4.  The `FlyTo` component initiates the map's `flyTo` animation. Crucially, it also listens for the `moveend` event, which Leaflet fires when any map movement (including the flight animation) is complete.
    5.  When `moveend` is detected, `FlyTo` calls a callback function, `onSearchResultHandled`.
    6.  This callback function is passed all the way from `App.tsx`, and its job is to **set the `searchResult` state back to `null`**.
    7.  By nullifying the `searchResult`, the `FlyTo` component is unmounted, and the animation does not trigger again. This leaves the user free to pan, zoom, and interact with the map as they please.

This one-time execution of the flight animation ensures a smooth and intuitive user experience.
