/**
 * =======================================================================
 * useTheme.ts - Διαχείριση Dark/Light Mode
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Διαχειρίζεται την εναλλαγή μεταξύ σκοτεινής (dark) και φωτεινής
 *   (light) θέασης της εφαρμογής, με αποθήκευση στο localStorage.
 *
 * ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ ΤΟ TAILWIND DARK MODE:
 *   Το TailwindCSS χρησιμοποιεί την κλάση 'dark' στο <html> element.
 *   Αν υπάρχει: dark:bg-gray-900 ενεργοποιείται
 *   Αν δεν υπάρχει: bg-white ενεργοποιείται
 *   Οπότε μόνο αν προσθέσουμε/αφαιρέσουμε το 'dark' class από το
 *   document.documentElement (= το <html> tag), αλλάζει το theme.
 *
 * PERSISTENCE:
 *   Αποθηκεύουμε 'dark' ή 'light' στο localStorage.
 *   Έτσι θυμόμαστε την επιλογή και μετά από ανανέωση σελίδας.
 *
 * ΧΡΗΣΗ:
 *   const { isDark, toggleTheme } = useTheme();
 *   <button onClick={toggleTheme}>Toggle</button>
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Header.tsx (κουμπί εναλλαγής theme)
 * =======================================================================
 */

import { useEffect, useState } from 'react';

/**
 * useTheme - Custom hook για dark/light mode.
 *
 * ΕΠΙΣΤΡΕΦΕΙ:
 *   isDark     - true αν είναι ενεργό το dark mode
 *   toggleTheme - συνάρτηση για εναλλαγή
 */
export function useTheme() {
    // Lazy initializer: η συνάρτηση μέσα στο useState() τρέχει ΜΟΝΟ
    // την πρώτη φορά για να ορίσει την αρχική τιμή από localStorage
    const [isDark, setIsDark] = useState<boolean>(() => {
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';  // Επαναφορά από localStorage
        return false;  // Default: light mode
    });

    // Εφαρμόζουμε το theme κάθε φορά που αλλάζει το isDark
    useEffect(() => {
        // document.documentElement = το <html> element
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');           // Προσθέτουμε κλάση 'dark' στο <html>
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');        // Αφαιρούμε κλάση 'dark'
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);  // Τρέχει κάθε φορά που αλλάζει το isDark

    return {
        isDark,
        // toggleTheme: εναλλάσσει dark ↔ light
        // d => !d: αν d=true → false, αν d=false → true
        toggleTheme: () => setIsDark(d => !d)
    };
}
