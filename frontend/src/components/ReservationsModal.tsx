/**
 * =======================================================================
 * ReservationsModal.tsx - Modal Ιστορικού Κρατήσεων
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει modal με το ιστορικό κρατήσεων parking του συνδεδεμένου χρήστη.
 *   Ανακτά δεδομένα από το backend κάθε φορά που ανοίγει το modal.
 *
 * ΡΟΗ ΔΕΔΟΜΕΝΩΝ:
 *   1. Χρήστης κλικάρει "Reservations" στο Header
 *   2. Modal ανοίγει (isOpen = true)
 *   3. useEffect εντοπίζει αλλαγή σε isOpen → fetch στο API
 *   4. Backend επιστρέφει λίστα κρατήσεων για τον συγκεκριμένο χρήστη
 *   5. Ταξινομούμε από νεότερη προς παλαιότερη (sort descending)
 *   6. Εμφανίζουμε κάρτες με λεπτομέρειες κάθε κράτησης
 *
 * ΚΑΤΑΣΤΑΣΕΙΣ ΦΟΡΤΩΣΗΣ:
 *   - loading=true: εμφανίζει spinner (γυριστό κύκλος)
 *   - error: εμφανίζει μήνυμα σφάλματος
 *   - reservations.length === 0: εμφανίζει "κενό" μήνυμα
 *   - κανονικά: λίστα καρτών κρατήσεων
 *
 * ΕΝΔΕΙΞΗ "ACTIVE":
 *   Μια κράτηση είναι ενεργή αν δεν έχει end_time ή αν το end_time
 *   είναι στο μέλλον (δεν έχει παρέλθει ακόμα).
 *
 * AUTHENTICATION:
 *   authService.getAuthHeaders() επιστρέφει { Authorization: "Bearer <token>" }
 *   Χρειάζεται γιατί το /reservations endpoint απαιτεί σύνδεση.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   AuthContext.tsx (user.id), authService.ts (auth headers),
 *   reservation.ts (τύπος Reservation), MainLayout.tsx (άνοιγμα/κλείσιμο)
 * =======================================================================
 */

import { useEffect, useState } from 'react';
import type { Reservation } from '../types/reservation';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

interface Props {
    isOpen: boolean;    // Αν το modal είναι ανοιχτό
    onClose: () => void; // Callback κλεισίματος
    apiBase: string;    // URL βάσης API (π.χ. "http://localhost:8000/api")
}

export default function ReservationsModal({ isOpen, onClose, apiBase }: Props) {
    // user: συνδεδεμένος χρήστης (χρειαζόμαστε το user.id για το API)
    const { user } = useAuth();

    // reservations: λίστα κρατήσεων που ανακτήθηκαν από backend
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);  // Αν φορτώνει
    const [error, setError] = useState<string | null>(null);  // Μήνυμα σφάλματος

    /**
     * useEffect - Φορτώνει κρατήσεις κάθε φορά που ανοίγει το modal.
     * Εξαρτάται από: isOpen (αν ανοίξει), user (ποιος είναι), apiBase (URL)
     * Τρέχει ΜΟΝΟ αν και το modal είναι ανοιχτό ΚΑΙ υπάρχει χρήστης.
     */
    useEffect(() => {
        if (isOpen && user) {
            setLoading(true);
            setError(null);  // Καθαρίζουμε τυχόν προηγούμενο σφάλμα

            // fetch: κάνουμε HTTP GET στο /reservations/user/{id}
            // Χρειάζεται Authorization header γιατί είναι protected endpoint
            fetch(`${apiBase}/reservations/user/${user.id}`, {
                headers: authService.getAuthHeaders()  // { Authorization: "Bearer ..." }
            })
                .then(res => {
                    // Αν το HTTP status δεν είναι 200-299:던ξε σφάλμα
                    if (!res.ok) throw new Error('Failed to fetch reservations');
                    return res.json();  // Μετατροπή JSON απόκρισης σε JS object
                })
                .then((data: Reservation[]) => {
                    // Ταξινόμηση: νεότερη κράτηση πρώτη (descending)
                    // new Date(b.start_time).getTime(): μετατροπή ημερομηνίας σε ms
                    // Αφαίρεση: θετικό = b πριν a (b νεότερο)
                    const sorted = data.sort((a, b) =>
                        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                    );
                    setReservations(sorted);
                })
                .catch(err => {
                    console.error(err);
                    setError('Could not load reservations');  // Εμφάνιση σφάλματος
                })
                .finally(() => setLoading(false));  // Σταματάει spinner σε κάθε περίπτωση
        }
    }, [isOpen, user, apiBase]);  // Τρέχει ξανά αν αλλάξει κάποιο από αυτά

    // Αν είναι κλειστό, δεν αποδίδουμε τίποτα
    if (!isOpen) return null;

    return (
        // Backdrop - σκούρο overlay πίσω από modal
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* Modal κοντέινερ - max-w-2xl: πιο πλατύ από FavoritesModal */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Κεφαλίδα modal */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        My Reservations
                    </h2>
                    {/* Κουμπί κλεισίματος (X) */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Περιεχόμενο - overflow-y-auto: scroll αν πολλές κρατήσεις */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        /* Spinner φόρτωσης - animate-spin: CSS animation περιστροφής */
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        /* Μήνυμα σφάλματος */
                        <div className="text-center py-8 text-red-500">
                            {error}
                        </div>
                    ) : reservations.length === 0 ? (
                        /* Κενή κατάσταση: δεν έχει κρατήσεις ακόμα */
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No reservations found.</p>
                            <p className="text-sm mt-2">Reserve a spot to see it here.</p>
                        </div>
                    ) : (
                        /* Λίστα καρτών κρατήσεων */
                        <div className="space-y-4">
                            {reservations.map(res => (
                                /* Κάρτα κράτησης - key: μοναδικό ID για React reconciliation */
                                <div key={res.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        {/* Αριστερό τμήμα: πληροφορίες θέσης */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {/* Τοποθεσία θέσης */}
                                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                                    {res.spot.location}
                                                </h3>
                                                {/* Badge "Active": εμφανίζεται αν η κράτηση δεν έχει λήξει */}
                                                {/* Λογική: αν δεν υπάρχει end_time Ή αν end_time είναι μελλοντικό */}
                                                {!(res.end_time && new Date(res.end_time) < new Date()) && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            {/* Πόλη/Περιοχή */}
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {res.spot.city ? `${res.spot.city}, ` : ''}{res.spot.area || ''}
                                            </p>
                                        </div>

                                        {/* Δεξί τμήμα: ημερομηνία και ώρα */}
                                        <div className="text-right text-sm">
                                            {/* Ημερομηνία έναρξης */}
                                            <div className="text-gray-900 dark:text-gray-200 font-medium">
                                                {new Date(res.start_time).toLocaleDateString()}
                                            </div>
                                            {/* Ώρα έναρξης - λήξης */}
                                            {/* toLocaleTimeString: μορφοποίηση ώρας (π.χ. "14:30") */}
                                            <div className="text-xs text-gray-500 dark:text-gray-500">
                                                {new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' - '}
                                                {/* Αν δεν υπάρχει end_time: "Now" (ακόμα σε εξέλιξη) */}
                                                {res.end_time
                                                    ? new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : 'Now'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
