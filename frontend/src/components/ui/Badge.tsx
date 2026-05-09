/**
 * =======================================================================
 * Badge.tsx - Μικρή Ετικέτα (Επαναχρησιμοποιήσιμο UI Component)
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει ένα μικρό "badge" (ετικέτα/σήμα) για κατηγορίες, φίλτρα ή κατάσταση.
 *   Π.χ. "Active", "Free", "Admin" κτλ.
 *
 * ΧΡΗΣΗ:
 *   <Badge>Active</Badge>
 *   <Badge>Free Parking</Badge>
 *
 * PropsWithChildren:
 *   Τύπος React που ορίζει ότι το component δέχεται children (οτιδήποτε μέσα).
 *   Ισοδύναμο με: { children: ReactNode }
 *   Βολικό shortcut για simple wrapper components.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Οποιοδήποτε component χρειάζεται styled label
 * =======================================================================
 */

import type { PropsWithChildren } from "react";

/**
 * Badge - Εμφανίζει στρογγυλεμένη ετικέτα με γκρι φόντο.
 * Υποστηρίζει dark mode.
 */
export default function Badge({ children }: PropsWithChildren) {
    return (
        /* inline-flex: διατηρεί το badge inline αλλά επιτρέπει flex layout εσωτερικά */
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {children}
        </span>
    );
}
