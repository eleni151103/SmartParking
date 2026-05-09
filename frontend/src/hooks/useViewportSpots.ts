/**
 * =======================================================================
 * useViewportSpots.ts - Θέσεις Parking στο Ορατό Τμήμα του Χάρτη
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Φορτώνει θέσεις parking από το backend βάσει των ορίων (bounds)
 *   του ορατού τμήματος του χάρτη. Ξαναφορτώνει όταν ο χρήστης
 *   κουνά ή κάνει zoom στον χάρτη.
 *
 * VIEWPORT / BOUNDS:
 *   Το ορατό τμήμα χάρτη ορίζεται από 4 συντεταγμένες:
 *   - swLat, swLng: νοτιοδυτική γωνία (κάτω-αριστερά)
 *   - neLat, neLng: βορειοανατολική γωνία (πάνω-δεξιά)
 *   Ζητάμε ΜΟΝΟ τις θέσεις εντός αυτού του ορθογωνίου.
 *
 * ΓΙΑΤΙ ΌΧΙ ΟΛΕΣ ΟΙ ΘΕΣΕΙΣ:
 *   Αν έχουμε 10.000 θέσεις, δεν θέλουμε να τις φορτώνουμε όλες.
 *   Φορτώνουμε μόνο αυτές που φαίνονται στην οθόνη (έως 200).
 *
 * useMemo:
 *   Αποθηκεύει το query string και δεν το ξαναϋπολογίζει αν τα bounds
 *   δεν έχουν αλλάξει. Εξοικονομεί χρόνο και αποτρέπει gereksiz re-renders.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   MapView.tsx (στέλνει τα bounds κάθε φορά που κουνιέται ο χάρτης)
 * =======================================================================
 */

import { useEffect, useMemo, useState } from "react";
import type { ParkingSpot } from "../types/parking";
import { normalizeSpot } from "../utils/normalizeSpot.ts";
import { authService } from "../services/authService";

/** Bounds - Τα όρια του ορατού τμήματος χάρτη */
type Bounds = { swLat: number; swLng: number; neLat: number; neLng: number };

/**
 * useViewportSpots - Custom hook για φόρτωμα θέσεων βάσει viewport.
 *
 * ΠΑΡΑΜΕΤΡΟΙ:
 *   apiBase - URL βάσης του API (default: localhost:8000/api)
 *   bounds  - τα όρια του ορατού χάρτη
 *   status  - φίλτρο κατάστασης (προαιρετικό)
 *   limit   - μέγιστος αριθμός θέσεων (default: 200)
 *
 * ΕΠΙΣΤΡΕΦΕΙ: Λίστα ParkingSpot εντός των bounds
 */
export function useViewportSpots(
    apiBase = "http://localhost:8000/api",
    bounds: Bounds,
    status: "Available" | "Occupied" | "Reserved" | "Maintenance" | undefined = undefined,
    limit = 200
) {
    // spots: οι θέσεις που φαίνονται τώρα στον χάρτη
    const [spots, setSpots] = useState<ParkingSpot[]>([]);

    // useMemo: Δημιουργεί το query string ΜΟΝΟ όταν αλλάζουν bounds/status/limit
    // URLSearchParams: βοηθητική κλάση για δημιουργία query strings
    // Παράδειγμα αποτέλεσμα: "swLat=37.9&swLng=23.6&neLat=38.1&neLng=23.9&limit=200"
    const qs = useMemo(() => {
        const p = new URLSearchParams({
            swLat: String(bounds.swLat),
            swLng: String(bounds.swLng),
            neLat: String(bounds.neLat),
            neLng: String(bounds.neLng),
            limit: String(limit),
        });
        // Προσθέτουμε status μόνο αν έχει οριστεί
        if (status) p.set("status", status);
        return p.toString();
    }, [bounds, status, limit]);  // Ξαναϋπολογίζεται μόνο αν αλλάξουν αυτά

    // Φόρτωση θέσεων όταν αλλάζει το query string (= ο χρήστης κούνησε τον χάρτη)
    useEffect(() => {
        // cancelled: αποτρέπει race conditions (αν ο χρήστης κουνάει γρήγορα τον χάρτη)
        // αν έρθει νέο request, το προηγούμενο "ακυρώνεται"
        let cancelled = false;

        (async () => {
            // Προσθήκη authorization headers αν είναι συνδεδεμένος
            const headers: Record<string, string> = {};
            if (authService.isAuthenticated()) {
                Object.assign(headers, authService.getAuthHeaders());
            }

            // HTTP GET στο in_viewport endpoint με τα bounds ως query params
            const res = await fetch(`${apiBase}/parking/spots/in_viewport?${qs}`, {
                headers
            });
            if (!res.ok) return;

            // Επιστρέφει: { spots: [...], total: N }
            const data: { spots: ParkingSpot[]; total: number } = await res.json();

            if (!cancelled) {
                // normalizeSpot: καθαρίζει κάθε spot (σωστοί τύποι, συνεπή ονόματα)
                setSpots(data.spots.map(normalizeSpot));
            }
        })();

        // Cleanup: αν έρθει νέο request πριν τελειώσει αυτό, το "ακυρώνουμε"
        return () => { cancelled = true; };
    }, [apiBase, qs]);  // Τρέχει ξανά όταν αλλάζει qs (= νέα bounds)

    return spots;
}
