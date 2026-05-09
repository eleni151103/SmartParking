/**
 * =======================================================================
 * useLiveSpots.ts - Real-time Ενημερώσεις Θέσεων μέσω WebSocket
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Συνδέεται στον backend WebSocket server και λαμβάνει live updates
 *   για αλλαγές κατάστασης θέσεων parking.
 *   Αυτόματη επανασύνδεση αν κοπεί η σύνδεση (exponential backoff).
 *
 * ΤΙ ΕΙΝΑΙ ΤΟ WEBSOCKET:
 *   Σε αντίθεση με το HTTP (request-response), το WebSocket διατηρεί
 *   μια ανοιχτή σύνδεση. Ο server μπορεί να "σπρώξει" δεδομένα στον
 *   client ΑΜΕΣΩΣ χωρίς ο client να τα ζητήσει.
 *
 * EXPONENTIAL BACKOFF:
 *   Αν χαθεί η σύνδεση:
 *   - Πρώτη προσπάθεια: μετά από 500ms
 *   - Δεύτερη: 1000ms
 *   - Τρίτη: 2000ms ... μέχρι max 10 δευτερόλεπτα
 *   Αποφεύγει flood of reconnect requests αν ο server είναι down.
 *
 * ΧΡΗΣΗ:
 *   const { spots, connected } = useLiveSpots();
 *   // spots = [{ id: 5, status: "Occupied" }, ...]
 *   // connected = true αν WebSocket είναι ανοιχτό
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   MapView.tsx (ενημέρωση χρωμάτων markers), useLiveSpots χρησιμοποιείται
 *   σε συνδυασμό με useViewportSpots
 * =======================================================================
 */

import { useEffect, useRef, useState } from "react";

/** LiveSpot - Ελάχιστα δεδομένα από WebSocket (id + νέα κατάσταση) */
export type LiveSpot = { id: number; status: string };

// URL του WebSocket endpoint
// Αν υπάρχει VITE_WS_URL στο .env αρχείο, χρησιμοποιεί αυτό
// Αλλιώς: ws://localhost:8000/ws (ws = WebSocket protocol, όχι http)
const WS_ENDPOINT =
    (import.meta as any)?.env?.VITE_WS_URL ?? "ws://localhost:8000/ws";

/**
 * coerceToLiveSpot - Μετατρέπει άγνωστης δομής αντικείμενο σε LiveSpot.
 *
 * ΤΙ ΚΑΝΕΙ: Τα WebSocket μηνύματα μπορεί να έρθουν σε διαφορετικές μορφές.
 *           Αυτή η συνάρτηση τα "κανονικοποιεί" σε { id, status }.
 *
 * ΑΝΤΙΜΕΤΩΠΙΖΕΙ 3 ΜΟΡΦΕΣ:
 * 1. { id: 5, status: "Occupied" }       → απευθείας
 * 2. { spot_id: 5, status: "Occupied" }  → από MQTT consumer (spot_id αντί id)
 * 3. { topic: "parking/Athens/5/status", payload: "Occupied" } → MQTT format
 */
function coerceToLiveSpot(obj: any): LiveSpot | null {
    if (!obj || typeof obj !== "object") {
        return null;  // Δεν είναι αντικείμενο
    }

    // Μορφή 1 & 2: έχει id ή spot_id + status
    if (("id" in obj || "spot_id" in obj) && "status" in obj) {
        const id = Number("id" in obj ? obj.id : obj.spot_id);
        const status = String(obj.status);
        const result = Number.isFinite(id) ? { id, status } : null;
        return result;
    }

    // Μορφή 3: MQTT topic format
    if ("topic" in obj && "payload" in obj && typeof obj.topic === "string") {
        // topic = "parking/Athens/5/status" → split → ["parking", "Athens", "5", "status"]
        const parts = String(obj.topic).split("/");
        const maybeId = Number(parts?.[2]);  // Το 3ο τμήμα είναι το spot_id
        if (Number.isFinite(maybeId)) {
            const result = { id: maybeId, status: String(obj.payload) };
            return result;
        }
    }

    // Αν είναι πίνακας, ελέγχουμε το πρώτο στοιχείο
    if (Array.isArray(obj) && obj.length > 0) {
        return coerceToLiveSpot(obj[0]);
    }

    return null;  // Δεν αναγνωρίστηκε μορφή
}

/**
 * parseMessage - Αναλύει το raw WebSocket μήνυμα.
 *
 * ΤΙ ΚΑΝΕΙ: Το WebSocket μήνυμα έρχεται ως string (JSON) ή object.
 *           Το αναλύουμε και καλούμε coerceToLiveSpot.
 */
function parseMessage(data: any): LiveSpot | null {
    if (typeof data === "string") {
        try {
            // String → JSON.parse → JavaScript object
            const parsed = JSON.parse(data);
            return coerceToLiveSpot(parsed);
        } catch (e) {
            console.warn('Failed to parse JSON from string:', data, e);
            return null;
        }
    }
    if (typeof data === "object" && data !== null) {
        console.log('Processing object data:', data);
        return coerceToLiveSpot(data);
    }
    console.warn('Unhandled message type:', typeof data, data);
    return null;
}

/**
 * useLiveSpots - Custom hook για real-time WebSocket updates.
 *
 * ΕΠΙΣΤΡΕΦΕΙ:
 *   spots     - λίστα LiveSpot με τα πιο πρόσφατα statuses
 *   connected - true αν η WebSocket σύνδεση είναι ανοιχτή
 *   wsUrl     - το WebSocket URL (για debugging)
 */
export function useLiveSpots() {
    // spots: λίστα spot updates (ενημερώνεται όταν έρχονται νέα μηνύματα)
    const [spots, setSpots] = useState<LiveSpot[]>([]);

    // connected: κατάσταση WebSocket σύνδεσης
    const [connected, setConnected] = useState(false);

    // useRef: αποθηκεύει τιμές που ΔΕΝ επιφέρουν re-render όταν αλλάζουν
    // (σε αντίθεση με useState που κάνει re-render)

    // byIdRef: Map<id, LiveSpot> για γρήγορη αναζήτηση και αντικατάσταση
    const byIdRef = useRef<Map<number, LiveSpot>>(new Map());

    // wsRef: αναφορά στο WebSocket object
    const wsRef = useRef<WebSocket | null>(null);

    // reconnectTimerRef: αναφορά στο timer επανασύνδεσης (για καθαρισμό)
    const reconnectTimerRef = useRef<number | null>(null);

    // backoffRef: καθυστέρηση επανασύνδεσης (ξεκινά 500ms, διπλασιάζεται)
    const backoffRef = useRef(500);

    // isMountedRef: αν το component είναι ακόμα mounted (αποτρέπει memory leaks)
    const isMountedRef = useRef(true);

    // Ρύθμιση/καθαρισμός isMountedRef
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Καθαρισμός timer και WebSocket κατά unmount
            if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
            try { wsRef.current?.close(); } catch { }
        };
    }, []);

    useEffect(() => {
        /**
         * connect - Δημιουργεί νέα WebSocket σύνδεση.
         * Ορίζει callbacks για open, message, error, close.
         */
        const connect = () => {
            if (!isMountedRef.current) return;

            // Κλείνουμε τυχόν παλιά σύνδεση
            try { wsRef.current?.close(); } catch { }

            // Δημιουργούμε νέα WebSocket σύνδεση
            const ws = new WebSocket(WS_ENDPOINT);
            wsRef.current = ws;

            // Όταν η σύνδεση ανοίξει επιτυχώς
            ws.onopen = () => {
                if (!isMountedRef.current) return;
                setConnected(true);
                backoffRef.current = 500;  // Reset backoff - ξεκινάμε πάλι από 500ms
            };

            // Όταν λάβουμε μήνυμα
            ws.onmessage = (evt) => {
                if (!isMountedRef.current) return;

                // Αναλύουμε το μήνυμα
                const parsed = parseMessage(evt.data);
                if (!parsed) {
                    console.warn('Failed to parse WebSocket message:', evt.data);
                    return;
                }

                // Ενημερώνουμε τον Map (id → latest status)
                // Αν το ίδιο spot στείλει πολλά updates, κρατάμε μόνο το τελευταίο
                const next = new Map(byIdRef.current);
                next.set(parsed.id, parsed);
                byIdRef.current = next;

                // Μετατρέπουμε Map → Array και ενημερώνουμε React state
                setSpots(Array.from(next.values()));
            };

            /**
             * scheduleReconnect - Προγραμματίζει επανασύνδεση με backoff.
             */
            const scheduleReconnect = () => {
                if (!isMountedRef.current) return;
                setConnected(false);

                // Backoff: min(τρέχουσα καθυστέρηση, 10s)
                const delay = Math.min(backoffRef.current, 10_000);
                // Διπλασιασμός για επόμενη αποτυχία (max 10s)
                backoffRef.current = Math.min(backoffRef.current * 2, 10_000);

                // Καθαρίζουμε τυχόν εκκρεμή timer
                if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);

                // Προγραμματίζουμε επανασύνδεση μετά από delay ms
                reconnectTimerRef.current = window.setTimeout(connect, delay);
            };

            // Σε σφάλμα: προγραμμάτισε επανασύνδεση
            ws.onerror = () => {
                scheduleReconnect();
            };

            // Σε κλείσιμο σύνδεσης: προγραμμάτισε επανασύνδεση
            ws.onclose = () => {
                scheduleReconnect();
            };
        };

        // Αρχική σύνδεση
        connect();

        // Cleanup: κλείσιμο WebSocket κατά unmount ή re-run effect
        return () => {
            if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
            try { wsRef.current?.close(); } catch { }
            wsRef.current = null;
            setConnected(false);
        };
    }, []);  // [] = τρέχει μία φορά

    return { spots, connected, wsUrl: WS_ENDPOINT };
}
