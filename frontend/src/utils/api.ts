/**
 * =======================================================================
 * api.ts - Κεντρικός HTTP Client
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει ένα απλό "wrapper" γύρω από το fetch() του browser για
 *   HTTP requests στο backend.
 *
 * ΤΙ ΕΙΝΑΙ ΤΟ fetch():
 *   Ενσωματωμένη JavaScript συνάρτηση του browser για HTTP requests.
 *   Επιστρέφει Promise (ασύγχρονο αποτέλεσμα).
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ WRAPPER:
 *   - Αυτόματη προσθήκη του base URL (http://localhost:8000/api)
 *   - Αυτόματη προσθήκη Authorization header (JWT token)
 *   - Κεντρική διαχείριση σφαλμάτων
 *   - Αυτόματη μετατροπή JSON
 *
 * ΧΡΗΣΗ:
 *   import { api } from '../utils/api';
 *   const spots = await api.get<ParkingSpot[]>('/parking/spots');
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   authService.ts (για headers), όλα τα hooks και components που
 *   κάνουν API calls
 * =======================================================================
 */

import { authService } from '../services/authService';

// Βάση URL του backend API
// import.meta.env.VITE_API_BASE: αν υπάρχει στο .env αρχείο, το χρησιμοποιεί
// Αλλιώς: http://localhost:8000/api (για local development)
const API_BASE_URL = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';

/**
 * request - Η βασική συνάρτηση για όλα τα HTTP requests.
 *
 * ΤΙ ΚΑΝΕΙ: Φτιάχνει το request, στέλνει στον server, επιστρέφει δεδομένα.
 * ΠΑΡΑΜΕΤΡΟΙ:
 *   endpoint - το path μετά το /api, π.χ. "/parking/spots"
 *   options  - επιπλέον ρυθμίσεις (method, body, κτλ.)
 * ΕΠΙΣΤΡΕΦΕΙ: Promise<T> - τα δεδομένα από τον server (typed)
 * ΠΕΤΑΕΙ ΣΦΑΛΜΑ: Αν το server επιστρέψει error status (4xx, 5xx)
 *
 * GENERIC TYPE <T>:
 *   Το <T> λέει "η συνάρτηση επιστρέφει οποιονδήποτε τύπο".
 *   Ο καλών ορίζει τον τύπο: request<ParkingSpot[]>('/parking/spots')
 */
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Συνδυάζουμε base URL + endpoint
    const url = `${API_BASE_URL}${endpoint}`;

    // Παίρνουμε τα headers authentication (Authorization: Bearer <token>)
    const authHeaders = authService.getAuthHeaders();

    // Συγχωνεύουμε auth headers με τυχόν custom headers
    // spread operator (...): αντιγράφει όλα τα πεδία του object
    const headers = {
        ...authHeaders,                                         // Content-Type + Authorization
        ...options?.headers as Record<string, string>,         // Τυχόν επιπλέον headers
    };

    // Κάνουμε το HTTP request
    const response = await fetch(url, {
        ...options,  // method, body, κτλ.
        headers,     // τα headers που φτιάξαμε
        cache: 'no-store',  // prevent browser from caching API responses (avoids stale 401s)
    });

    // Αν ο server επέστρεψε σφάλμα (status 400, 401, 403, 404, 500...)
    if (!response.ok) {
        // Προσπαθούμε να διαβάσουμε το μήνυμα σφάλματος από τον server
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'API request failed');
    }

    // Επιτυχία: μετατρέπουμε JSON → JavaScript object και επιστρέφουμε
    return response.json();
}

/**
 * api - Το "public interface" για HTTP requests.
 *
 * Παρέχει 4 μεθόδους αντίστοιχα με τα 4 κύρια HTTP verbs:
 * - GET:    Ανάκτηση δεδομένων (δεν αλλάζει τίποτα στον server)
 * - POST:   Δημιουργία νέου resource (αποστέλλει δεδομένα στο body)
 * - PUT:    Ενημέρωση υπάρχοντος resource
 * - DELETE: Διαγραφή resource
 */
export const api = {
    /** GET request - Ανάκτηση δεδομένων χωρίς body */
    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

    /** POST request - Δημιουργία με JSON body */
    post: <T>(endpoint: string, body?: any) => request<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),          // Μετατροπή object → JSON string
        headers: { 'Content-Type': 'application/json' }
    }),

    /** PUT request - Ενημέρωση με JSON body */
    put: <T>(endpoint: string, body?: any) => request<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
    }),

    /** DELETE request - Διαγραφή χωρίς body */
    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
