/**
 * =======================================================================
 * FavoritesContext.tsx - Καθολική Κατάσταση Αγαπημένων Θέσεων
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Διαχειρίζεται τις αγαπημένες θέσεις στάθμευσης του χρήστη.
 *   Παρέχει add/remove/check functions σε ολόκληρη την εφαρμογή.
 *
 * OPTIMISTIC UPDATES (Αισιόδοξες Ενημερώσεις):
 *   Η κλασική προσέγγιση: κλικ → αναμονή API → ενημέρωση UI.
 *   Η αισιόδοξη: κλικ → αμεσα ενημέρωση UI → API call → αν αποτύχει, revert.
 *   Αποτέλεσμα: Η εφαρμογή φαίνεται ΠΟΛΥ πιο γρήγορη στον χρήστη.
 *
 * ΡΟΗΛ:
 *   1. Χρήστης κάνει login → fetchFavorites() φορτώνει από API
 *   2. Χρήστης κάνει logout → favorites γίνονται []
 *   3. addFavorite/removeFavorite: πρώτα UI, μετά API
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   AuthContext.tsx (χρειάζεται user για API calls),
 *   FavoritesModal.tsx, SpotListItem.tsx (κουμπί αγαπημένων)
 * =======================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

/**
 * FavoritesContextType - Τι παρέχει το FavoritesContext.
 */
interface FavoritesContextType {
    favorites: number[];                              // IDs αγαπημένων θέσεων
    addFavorite: (spotId: number) => Promise<void>;  // Προσθήκη αγαπημένου
    removeFavorite: (spotId: number) => Promise<void>; // Αφαίρεση αγαπημένου
    isFavorite: (spotId: number) => boolean;          // Έλεγχος αν είναι αγαπημένο
    loading: boolean;                                  // Φόρτωμα αγαπημένων
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

/**
 * FavoritesProvider - Το component που κρατά και μοιράζει τα αγαπημένα.
 */
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Παίρνουμε τον τρέχοντα χρήστη από το AuthContext
    const { user, isAuthenticated } = useAuth();

    // favorites: λίστα με τα IDs των αγαπημένων θέσεων (π.χ. [3, 7, 15])
    const [favorites, setFavorites] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    /**
     * fetchFavorites - Φορτώνει αγαπημένα από το backend.
     *
     * useCallback: "αποθηκεύει" τη συνάρτηση για να μην ξαναδημιουργείται
     * σε κάθε render. Αναδημιουργείται ΜΟΝΟ αν αλλάξουν user ή isAuthenticated.
     */
    const fetchFavorites = useCallback(async () => {
        if (!user || !isAuthenticated) {
            // Δεν υπάρχει χρήστης - καθαρίζουμε τα αγαπημένα
            setFavorites([]);
            return;
        }
        try {
            setLoading(true);
            // GET /api/users/{id}/favorites → επιστρέφει [3, 7, 15] (IDs)
            const res = await api.get<number[]>(`/users/${user.id}/favorites`);
            setFavorites(res || []);
        } catch (error: any) {
            // Αν λάβουμε 401 (unauthorized) κατά τη διάρκεια logout/session expiry,
            // το αγνοούμε σιωπηλά αντί να εμφανίσουμε σφάλμα
            if (error?.message?.includes('401')) {
                setFavorites([]);
                return;
            }
            console.error("Failed to fetch favorites", error);
        } finally {
            // finally: τρέχει ΠΑΝΤΑ (επιτυχία ή αποτυχία)
            setLoading(false);
        }
    }, [user, isAuthenticated]);

    // Όταν ο χρήστης συνδεθεί ή αποσυνδεθεί, ανανεώνουμε τα αγαπημένα
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchFavorites();  // Φόρτωσε αγαπημένα
        } else {
            setFavorites([]);  // Καθάρισε αγαπημένα (αποσυνδέθηκε)
        }
    }, [fetchFavorites, isAuthenticated, user]);

    /**
     * addFavorite - Προσθέτει θέση στα αγαπημένα με optimistic update.
     *
     * ΣΕΙΡΑ: Ενημέρωση UI → API call → αν αποτύχει, επαναφορά
     */
    const addFavorite = async (spotId: number) => {
        if (!user) return;
        try {
            // OPTIMISTIC: Αμεσα ενημέρωση UI (πριν το API)
            // prev => [...prev, spotId]: νέος πίνακας με το spotId στο τέλος
            setFavorites(prev => [...prev, spotId]);

            // API call στο backend
            await api.post(`/users/${user.id}/favorites/${spotId}`);
        } catch (error) {
            console.error("Failed to add favorite", error);
            // REVERT: Αν αποτύχει το API, αφαιρούμε από UI
            setFavorites(prev => prev.filter(id => id !== spotId));
        }
    };

    /**
     * removeFavorite - Αφαιρεί θέση από τα αγαπημένα με optimistic update.
     */
    const removeFavorite = async (spotId: number) => {
        if (!user) return;
        try {
            // OPTIMISTIC: Αμεσα αφαίρεση από UI
            // filter: κρατά μόνο τα IDs που ΔΕΝ είναι το spotId
            setFavorites(prev => prev.filter(id => id !== spotId));

            await api.delete(`/users/${user.id}/favorites/${spotId}`);
        } catch (error) {
            console.error("Failed to remove favorite", error);
            // REVERT: Αν αποτύχει, ξαναπροσθέτουμε
            setFavorites(prev => [...prev, spotId]);
        }
    };

    /**
     * isFavorite - Ελέγχει αν μια θέση είναι αγαπημένη.
     * ΠΑΡΑΜΕΤΡΟΙ: spotId - το ID της θέσης προς έλεγχο
     * ΕΠΙΣΤΡΕΦΕΙ: true αν το spotId είναι στη λίστα favorites
     */
    const isFavorite = (spotId: number) =>
        Array.isArray(favorites) && favorites.includes(spotId);

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, loading }}>
            {children}
        </FavoritesContext.Provider>
    );
};

/**
 * useFavorites - Custom hook για πρόσβαση στα αγαπημένα.
 * ΧΡΗΣΗ: const { isFavorite, addFavorite, removeFavorite } = useFavorites();
 */
export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};
