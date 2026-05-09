/**
 * =======================================================================
 * IconButton.tsx - Κυκλικό Κουμπί για Εικονίδια (UI Component)
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει ένα τυποποιημένο κουμπί για εικονίδια (SVG/emoji/κείμενο).
 *   Χρησιμοποιείται για μικρά κουμπιά δράσης όπου δεν χρειάζεται κείμενο.
 *
 * ΧΡΗΣΗ:
 *   <IconButton onClick={() => toggleTheme()}>🌙</IconButton>
 *   <IconButton onClick={handleSearch}><SearchIcon /></IconButton>
 *
 * ButtonHTMLAttributes:
 *   TypeScript τύπος που περιλαμβάνει ΟΛΑ τα native button attributes
 *   (onClick, disabled, type, aria-label, κτλ.).
 *   Με {...props}: περνάμε αυτόματα όλα αυτά στο <button> element.
 *   Δεν χρειάζεται να ορίσουμε κάθε prop ξεχωριστά.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Header.tsx (dark mode toggle, search κουμπιά)
 * =======================================================================
 */

import type { ButtonHTMLAttributes } from "react";

/** Props: Ό,τι δέχεται ένα native <button> element */
type Props = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * IconButton - Τετράγωνο κουμπί 10x10 με στρογγυλεμένες γωνίες.
 * Υποστηρίζει dark mode, hover και active states.
 * ...props: spread operator - περνάει όλα τα props στο button
 */
export default function IconButton({ children, ...props }: Props) {
    return (
        <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-500"
            {...props}  // Περνάμε onClick, disabled, aria-label κτλ. από τον caller
        >
            {children}  {/* Το εικονίδιο ή emoji */}
        </button>
    );
}
