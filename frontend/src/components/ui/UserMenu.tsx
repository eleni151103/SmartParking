/**
 * =======================================================================
 * UserMenu.tsx - Dropdown Menu Χρήστη
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει κυκλικό κουμπί με εικονίδιο χρήστη στο Header.
 *   Κλικ → ανοίγει dropdown με επιλογές:
 *   - Πληροφορίες χρήστη (όνομα, email)
 *   - Αλλαγή κωδικού
 *   - Αγαπημένα spots
 *   - Κρατήσεις
 *   - Admin Dashboard (μόνο αν is_admin=true)
 *   - Sign Out
 *
 * ΚΛΕΙΣΙΜΟ ΜΕΝΟΥ:
 *   Το menu κλείνει αυτόματα αν ο χρήστης κλικάρει ΕΞΩ από αυτό.
 *   Τεχνική: useRef + addEventListener('mousedown') για εντοπισμό εξωτερικού κλικ.
 *   menuRef.current.contains(event.target): ελέγχει αν το κλικ έγινε μέσα στο menu.
 *
 * useRef:
 *   Κρατάει αναφορά στο DOM element του menu (div).
 *   Δεν προκαλεί re-render αν αλλάξει (σε αντίθεση με useState).
 *   Χρησιμοποιείται για DOM operations (π.χ. contains check).
 *
 * CLEANUP:
 *   Ο event listener αφαιρείται στο cleanup function του useEffect.
 *   Αποτρέπει memory leaks και λανθασμένη συμπεριφορά.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Header.tsx (render), AuthContext.tsx (user/logout),
 *   Modal.tsx + ChangePasswordForm.tsx (αλλαγή κωδικού)
 * =======================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { ChangePasswordForm } from '../auth/ChangePasswordForm';

interface Props {
  onFavoritesClick?: () => void;     // Callback για άνοιγμα FavoritesModal
  onReservationsClick?: () => void;  // Callback για άνοιγμα ReservationsModal
}

export const UserMenu: React.FC<Props> = ({ onFavoritesClick, onReservationsClick }) => {
  // user: συνδεδεμένος χρήστης (email, full_name, is_admin κτλ.)
  // logout: function που αποσυνδέει τον χρήστη
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);  // Αν το dropdown είναι ανοιχτό

  // isChangePasswordModalOpen: ξεχωριστό modal για αλλαγή κωδικού
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // menuRef: αναφορά στο DOM element του dropdown
  // Χρησιμοποιείται για να εντοπίσουμε εξωτερικά κλικ
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * useEffect - Εντοπισμός κλικ εκτός menu για αυτόματο κλείσιμο.
   * Εκτελείται όταν αλλάζει το isMenuOpen.
   *
   * Λογική:
   * - Αν menu ανοιχτό: προσθέτει listener για mousedown
   * - Αν κλικ εκτός menu: κλείνει
   * - Cleanup: αφαιρεί listener για να μην "κρέμεται" μετά
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // contains: true αν το target (clicked element) είναι μέσα στο menuRef
      // Αν ΔΕΝ είναι μέσα: κλείνουμε menu
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // Προσθέτουμε listener μόνο αν menu είναι ανοιχτό (performance optimization)
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup: αφαιρούμε listener όταν menu κλείνει ή component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);  // Τρέχει ξανά αν αλλάξει το isMenuOpen

  // Αν δεν υπάρχει χρήστης, δεν εμφανίζουμε τίποτα
  if (!user) return null;

  /** handleLogout - Αποσυνδέει χρήστη και κλείνει menu */
  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  /** handleChangePassword - Κλείνει dropdown και ανοίγει modal κωδικού */
  const handleChangePassword = () => {
    setIsMenuOpen(false);
    setIsChangePasswordModalOpen(true);
  };

  /** handleFavorites - Κλείνει dropdown και ανοίγει FavoritesModal */
  const handleFavorites = () => {
    if (onFavoritesClick) {
      onFavoritesClick();
    }
    setIsMenuOpen(false);
  };

  /** handleReservations - Κλείνει dropdown και ανοίγει ReservationsModal */
  const handleReservations = () => {
    if (onReservationsClick) {
      onReservationsClick();
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* ref={menuRef}: συνδέουμε το menuRef με αυτό το div */}
      <div className="relative" ref={menuRef}>
        {/* Κυκλικό κουμπί χρήστη - toggle για dropdown */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}  // Toggle: ανοίγει/κλείνει
          className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          aria-label="User menu"  // Για screen readers
        >
          {/* Εικονίδιο χρήστη */}
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>

        {/* Dropdown menu - εμφανίζεται μόνο αν isMenuOpen=true */}
        {isMenuOpen && (
          /* absolute right-0: τοποθετείται δεξιά-κάτω από το κουμπί */
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[9999]">
            {/* Πληροφορίες χρήστη στην κορυφή */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
              {/* truncate: κόβει email αν είναι πολύ μακρύ */}
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>

            {/* Επιλογές menu */}
            <div className="py-1">
              <button
                onClick={handleChangePassword}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleFavorites}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Favorite Parking Spots
              </button>
              <button
                onClick={handleReservations}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Reservations
              </button>
              {/* Σύνδεσμος Admin Dashboard - μόνο αν ο χρήστης είναι admin */}
              {user.is_admin && (
                <a
                  href="/admin"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Admin Dashboard
                </a>
              )}
            </div>

            {/* Αποσύνδεση - διαχωρισμένο με border, κόκκινο χρώμα */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Αλλαγής Κωδικού - ανεξάρτητο από dropdown */}
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        title="Change Password"
      >
        <ChangePasswordForm onClose={() => setIsChangePasswordModalOpen(false)} />
      </Modal>
    </>
  );
};
