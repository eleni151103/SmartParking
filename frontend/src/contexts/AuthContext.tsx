/**
 * =======================================================================
 * AuthContext.tsx - Καθολική Κατάσταση Αυθεντικοποίησης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Δημιουργεί ένα "καθολικό context" (global context) που κάνει
 *   διαθέσιμα τα δεδομένα σύνδεσης (user, login, logout) σε
 *   ΟΛΟΚΛΗΡΗ την εφαρμογή χωρίς prop drilling.
 *
 * ΤΙ ΕΙΝΑΙ ΤΟ REACT CONTEXT:
 *   Φανταστείτε ότι ο χρήστης είναι "κοινή μεταβλητή" που χρειάζεται
 *   σε πολλά components (Header, Sidebar, MapView κτλ.).
 *   Χωρίς Context, θα έπρεπε να περνάμε τον χρήστη ως prop από
 *   component σε component (prop drilling = επίπονο).
 *   Το Context επιτρέπει σε οποιοδήποτε component να "ζητήσει"
 *   τον χρήστη απευθείας χωρίς μεσάζοντες.
 *
 * PERSISTENCE (Διατήρηση Σύνδεσης):
 *   Αποθηκεύουμε τον χρήστη στο localStorage, έτσι αν ο χρήστης
 *   ανανεώσει τη σελίδα ή κλείσει/ανοίξει τον browser,
 *   παραμένει συνδεδεμένος.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Όλα τα components που χρησιμοποιούν useAuth()
 * =======================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/user';

/**
 * AuthContextType - Ορίζει τι παρέχει το AuthContext.
 * Κάθε component που καλεί useAuth() παίρνει αυτές τις τιμές.
 */
interface AuthContextType {
  user: User | null;          // Ο συνδεδεμένος χρήστης (null αν δεν υπάρχει)
  login: (user: User) => void; // Συνάρτηση για σύνδεση
  logout: () => void;          // Συνάρτηση για αποσύνδεση
  isAuthenticated: boolean;    // true αν ο χρήστης είναι συνδεδεμένος
  loading: boolean;            // true ενώ φορτώνουμε από localStorage
}

// Δημιουργούμε το context object
// undefined: αρχική τιμή πριν το Provider - αν κάποιος το χρησιμοποιήσει
// εκτός Provider, θα πάρει σφάλμα (το ελέγχουμε στο useAuth)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Κλειδί αποθήκευσης στο localStorage
const USER_STORAGE_KEY = 'smart_parking_user';

/**
 * AuthProvider - Το component που "περιτυλίγει" την εφαρμογή.
 *
 * ΤΙ ΚΑΝΕΙ: Κρατά την κατάσταση σύνδεσης και την κάνει διαθέσιμη
 *           σε όλα τα child components μέσω Context.
 * ΠΑΡΑΜΕΤΡΟΙ: children - όλη η εφαρμογή (App.tsx → όλα τα components)
 *
 * ΣΚΕΦΤΕΙΤΕ ΤΟ ΩΣ: Ένα "κοντέινερ" που τυλίγει ολόκληρη την εφαρμογή
 * και κρατά τα δεδομένα σύνδεσης ορατά παντού.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // user: ο τρέχων χρήστης (null = δεν υπάρχει)
  const [user, setUser] = useState<User | null>(null);

  // loading: true ενώ ελέγχουμε localStorage για αποθηκευμένο χρήστη
  // Χρειάζεται για να μην δείχνουμε "login" ενώ φορτώνουμε
  const [loading, setLoading] = useState(true);

  // useEffect με [] = τρέχει ΜΟΝΟ μια φορά, όταν το component φορτωθεί
  // Ελέγχουμε αν υπάρχει αποθηκευμένος χρήστης από προηγούμενη σύνδεση
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        // Μετατρέπουμε JSON string → User object
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Αν το JSON είναι κατεστραμμένο, το διαγράφουμε
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setLoading(false);  // Τελειώσαμε το φόρτωμα
  }, []);  // [] = κενές εξαρτήσεις = τρέχει μία φορά

  /**
   * login - Αποθηκεύει τον χρήστη στο state και στο localStorage.
   * ΠΑΡΑΜΕΤΡΟΙ: user - το User object που επέστρεψε το backend μετά το login
   */
  const login = (user: User) => {
    setUser(user);  // Ενημέρωση React state (επανα-render)
    // JSON.stringify: μετατρέπει User object → JSON string για αποθήκευση
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  };

  /**
   * logout - Διαγράφει τον χρήστη από παντού.
   */
  const logout = () => {
    setUser(null);  // Αφαίρεση από React state
    localStorage.removeItem(USER_STORAGE_KEY);  // Αφαίρεση από browser
  };

  // isAuthenticated: computed value - true αν υπάρχει χρήστης
  const isAuthenticated = user !== null;

  // Το Provider "μεταδίδει" τις τιμές σε όλα τα children components
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth - Custom hook για πρόσβαση στο AuthContext.
 *
 * ΤΙ ΚΑΝΕΙ: Επιτρέπει σε οποιοδήποτε component να πάρει τα auth δεδομένα.
 * ΧΡΗΣΗ: const { user, login, logout, isAuthenticated } = useAuth();
 * ΠΕΤΑΕΙ ΣΦΑΛΜΑ: Αν κληθεί εκτός AuthProvider (προστασία από λάθη)
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Αν το context είναι undefined, σημαίνει ότι δεν υπάρχει Provider
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
