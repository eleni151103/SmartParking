/**
 * =======================================================================
 * Modal.tsx - Επαναχρησιμοποιήσιμο Component Modal
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει ένα γενικό modal που μπορεί να χρησιμοποιηθεί παντού.
 *   Αντί να γράφουμε modal code σε κάθε component, το αφαιρούμε εδώ.
 *
 * ΑΡΧΗ: COMPOSITION PATTERN
 *   Το Modal δέχεται children (ReactNode) - οποιοδήποτε JSX.
 *   Έτσι μπορεί να περιέχει φόρμα, εικόνα, κείμενο ή οτιδήποτε άλλο.
 *   Π.χ.: <Modal><SpotForm /></Modal> ή <Modal><p>Confirm delete?</p></Modal>
 *
 * Z-INDEX:
 *   z-[9999]: πολύ υψηλό για να εμφανίζεται πάνω από όλα τα άλλα elements.
 *   Backdrop z-[9999] + content z-[10000]: το content πάνω από το backdrop.
 *
 * BACKDROP CLICK:
 *   Κλικ στο backdrop (σκούρο overlay) κλείνει το modal.
 *   Κλικ μέσα στο modal: δεν κλείνει (stopPropagation μέσω relative positioning).
 *
 * ΧΡΗΣΗ:
 *   <Modal isOpen={bool} onClose={fn} title="Τίτλος">
 *     <ΟποιοδήποτεComponent />
 *   </Modal>
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   AdminDashboard.tsx, UserMenu.tsx (χρησιμοποιούν Modal για forms/confirmations)
 * =======================================================================
 */

import React from 'react';
import type { ReactNode } from 'react';

/** ModalProps - Props του Modal component */
interface ModalProps {
  isOpen: boolean;     // Αν το modal είναι ανοιχτό
  onClose: () => void; // Callback κλεισίματος
  children: ReactNode; // Περιεχόμενο modal (οποιοδήποτε JSX)
  title?: string;      // Τίτλος (προαιρετικός)
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  // Αν είναι κλειστό, δεν αποδίδουμε τίποτα
  if (!isOpen) return null;

  return (
    // Overlay container: καλύπτει ολόκληρη την οθόνη
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop - σκούρο overlay πίσω από modal */}
      {/* onClick: κλείνει modal αν κλικάρει ο χρήστης εκτός */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70"
        onClick={onClose}
      />

      {/* Modal κοντέινερ - relative: το περιεχόμενο "επιπλέει" πάνω από backdrop */}
      {/* z-[10000]: ένα επίπεδο πάνω από backdrop (z-[9999]) */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-[10000]">
        {/* Κεφαλίδα: εμφανίζεται μόνο αν έχει title */}
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
            {/* Κουμπί κλεισίματος - aria-label για accessibility (screen readers) */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              {/* X εικονίδιο */}
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Περιεχόμενο: οτιδήποτε περαστεί ως children */}
        <div>{children}</div>
      </div>
    </div>
  );
};
