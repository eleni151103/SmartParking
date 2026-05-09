/**
 * =======================================================================
 * NotFound.tsx - Σελίδα 404 (Δεν Βρέθηκε)
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει φιλικό μήνυμα όταν ο χρήστης πηγαίνει σε URL που δεν υπάρχει.
 *   Π.χ. http://localhost:5173/κάτι-τυχαίο → 404
 *
 * ΠΟΤΕ ΕΜΦΑΝΙΖΕΤΑΙ:
 *   Στο App.tsx, αν το pathname δεν αντιστοιχεί σε γνωστή route
 *   (/, /admin, /login), εμφανίζεται αυτό το component.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   App.tsx (routing logic)
 * =======================================================================
 */

import React from 'react';

const NotFound: React.FC = () => {
    return (
        /* Κεντράρισμα περιεχομένου στη μέση της οθόνης */
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Μεγάλος αριθμός 404 σε μπλε */}
            <h1 className="text-6xl font-bold mb-4 text-blue-600">404</h1>
            <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
            <p className="text-lg mb-8 text-center max-w-md text-gray-600 dark:text-gray-400">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            {/* Σύνδεσμος επιστροφής στην αρχική σελίδα */}
            <a
                href="/"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg"
            >
                Go to Homepage
            </a>
        </div>
    );
};

export default NotFound;
