/**
 * =======================================================================
 * FavoritesModal.tsx - Modal Αγαπημένων Θέσεων Parking
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει modal με τις αγαπημένες θέσεις parking του χρήστη.
 *   Φιλτράρει τις θέσεις της εφαρμογής κρατώντας μόνο όσες ο χρήστης
 *   έχει σημειώσει ως αγαπημένες (αστέρι = κίτρινο).
 *
 * ΠΩΣ ΔΟΥΛΕΥΟΥΝ ΤΑ ΑΓΑΠΗΜΕΝΑ:
 *   Το FavoritesContext.tsx αποθηκεύει ένα array με IDs: [3, 7, 12, ...]
 *   Εδώ παίρνουμε όλες τις θέσεις (spots) και κρατάμε μόνο αυτές
 *   που το ID τους βρίσκεται σε αυτό το array.
 *
 * ΦΙΛΤΡΟ:
 *   spots.filter(s => favorites.includes(s.id))
 *   → από 50 θέσεις, κρατάμε μόνο αυτές με ID στη λίστα αγαπημένων
 *
 * ΚΕΝΗ ΚΑΤΑΣΤΑΣΗ:
 *   Αν δεν υπάρχουν αγαπημένα, εμφανίζεται φιλικό μήνυμα.
 *   Αλλιώς, χρησιμοποιούμε SpotList (ίδιο component με Sidebar).
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   FavoritesContext.tsx (λίστα IDs), SpotList.tsx (εμφάνιση καρτών),
 *   MainLayout.tsx (ανοίγει/κλείνει το modal)
 * =======================================================================
 */

import { useFavorites } from '../contexts/FavoritesContext';
import type { ParkingSpot } from '../types/parking';
import SpotList from './spots/SpotList';
import { drivingMinutes } from '../utils/distance';

interface Props {
    isOpen: boolean;                                 // Αν το modal είναι ανοιχτό
    onClose: () => void;                             // Callback κλεισίματος
    spots: ParkingSpot[];                            // Όλες οι θέσεις της εφαρμογής
    userCoords?: { lat: number; lng: number };       // Θέση χρήστη (για απόσταση)
}

export default function FavoritesModal({ isOpen, onClose, spots, userCoords }: Props) {
    // favorites: array με IDs αγαπημένων θέσεων (π.χ. [3, 7, 12])
    const { favorites } = useFavorites();

    // Αν το modal είναι κλειστό, δεν αποδίδουμε τίποτα
    if (!isOpen) return null;

    /**
     * favoriteSpots - Φιλτράρει τις θέσεις κρατώντας μόνο τις αγαπημένες.
     * favorites.includes(s.id): ελέγχει αν το ID βρίσκεται στη λίστα
     * Αποτέλεσμα: μόνο οι θέσεις που ο χρήστης έχει αστερίσει
     */
    const favoriteSpots = spots.filter(s => favorites.includes(s.id));

    return (
        // Backdrop - σκούρο overlay πίσω από modal
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {/* Modal κοντέινερ - max-h-[80vh]: max ύψος 80% οθόνης */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                {/* Κεφαλίδα modal */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        My Favorites
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

                {/* Περιεχόμενο - overflow-y-auto: scroll αν πολλά αγαπημένα */}
                <div className="flex-1 overflow-y-auto p-4">
                    {favoriteSpots.length === 0 ? (
                        /* Κενή κατάσταση: δεν έχει αγαπημένα ακόμα */
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No favorites yet.</p>
                            <p className="text-sm mt-2">Mark spots as favorite to see them here.</p>
                        </div>
                    ) : (
                        /* Λίστα αγαπημένων θέσεων - ίδιο component με Sidebar */
                        <SpotList
                            spots={favoriteSpots}
                            userCoords={userCoords}
                            showReserve={true}   // Ναι, εδώ εμφανίζουμε Reserve κουμπί
                            computeWalkMins={(m) => drivingMinutes(m)}  // μέτρα → λεπτά
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
