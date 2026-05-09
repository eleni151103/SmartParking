/**
 * =======================================================================
 * Header.tsx - Επικεφαλίδα Εφαρμογής
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Η μόνιμη μπάρα στην κορυφή της εφαρμογής. Περιέχει:
 *   - Logo + τίτλος εφαρμογής
 *   - Κουμπί αναζήτησης parking
 *   - Toggle dark/light mode
 *   - Login κουμπί (αν δεν είναι συνδεδεμένος) ή UserMenu (αν είναι)
 *   - Modal για login/register
 *
 * MODAL MANAGEMENT:
 *   Το Header ελέγχει την κατάσταση του auth modal (ανοιχτό/κλειστό)
 *   και ποια view φαίνεται (login ή register).
 *   Η εναλλαγή γίνεται με τα handleSwitchTo* functions.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   MainLayout.tsx (γονέας που στέλνει callbacks),
 *   AuthContext.tsx, Modal.tsx, LoginForm.tsx, RegisterForm.tsx, UserMenu.tsx
 * =======================================================================
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';
import { UserMenu } from './ui/UserMenu';

/** Props που λαμβάνει το Header από το MainLayout */
type Props = {
    isDark: boolean;              // Τρέχουσα κατάσταση theme
    toggleTheme: () => void;      // Εναλλαγή dark/light
    onSearchClick: () => void;    // Άνοιγμα SearchModal
    onFavoritesClick: () => void; // Άνοιγμα FavoritesModal
    onReservationsClick: () => void; // Άνοιγμα ReservationsModal
};

/** AuthModalView - Ποια φόρμα εμφανίζεται στο modal */
type AuthModalView = 'login' | 'register';

export default function Header({ isDark, toggleTheme, onSearchClick, onFavoritesClick, onReservationsClick }: Props) {
    const { isAuthenticated } = useAuth();

    // isAuthModalOpen: αν το login/register modal είναι ανοιχτό
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // authModalView: ποια φόρμα εμφανίζεται μέσα στο modal
    const [authModalView, setAuthModalView] = useState<AuthModalView>('login');

    /** handleOpenLogin - Ανοίγει το modal με login view */
    const handleOpenLogin = () => {
        setAuthModalView('login');
        setIsAuthModalOpen(true);
    };

    /** handleSwitchToRegister - Εναλλάσσει σε register μέσα στο modal */
    const handleSwitchToRegister = () => {
        setAuthModalView('register');
    };

    /** handleSwitchToLogin - Εναλλάσσει πίσω σε login */
    const handleSwitchToLogin = () => {
        setAuthModalView('login');
    };

    /**
     * handleCloseAuthModal - Κλείνει το modal.
     * setTimeout: Reset στο login view ΜΕΤΑ το animation κλεισίματος
     * (300ms = διάρκεια animation του Modal)
     */
    const handleCloseAuthModal = () => {
        setIsAuthModalOpen(false);
        setTimeout(() => setAuthModalView('login'), 300);
    };

    return (
        <>
            {/* Header bar - πάντα ορατό στην κορυφή */}
            <header className="w-full border-b border-gray-300 bg-slate-100 shadow-md dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between px-4 py-3 md:px-6">
                    {/* Logo + brand name */}
                    <div className="flex items-center gap-2">
                        <img
                            src="/smart-parking-logo.png"
                            alt="SmartPark Logo"
                            className="h-10 w-auto object-contain"
                        />
                        <span className="text-xl font-bold text-slate-800 dark:text-white">
                            SmartParking
                        </span>
                    </div>

                    {/* Κουμπιά δεξιά */}
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Κουμπί αναζήτησης - ανοίγει SearchModal */}
                        <button
                            onClick={onSearchClick}
                            className="p-2 rounded-full text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Search for parking"
                        >
                            {/* SVG εικονίδιο μεγεθυντικού φακού */}
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {/* Κουμπί dark/light mode */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-white/80 text-gray-700 hover:bg-white transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 shadow-sm"
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {/* 🌙 σε light mode, ☀️ σε dark mode */}
                            {isDark ? '☀️' : '🌙'}
                        </button>

                        {/* Conditional: UserMenu αν συνδεδεμένος, Login button αν όχι */}
                        {isAuthenticated ? (
                            // Συνδεδεμένος: εμφάνιση avatar/menu με αγαπημένα/κρατήσεις
                            <UserMenu onFavoritesClick={onFavoritesClick} onReservationsClick={onReservationsClick} />
                        ) : (
                            // Μη συνδεδεμένος: κουμπί login
                            <button
                                onClick={handleOpenLogin}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Auth Modal - εμφανίζεται πάνω από τα πάντα */}
            <Modal
                isOpen={isAuthModalOpen}
                onClose={handleCloseAuthModal}
                title={authModalView === 'login' ? 'Sign In' : 'Create Account'}
            >
                {/* Εναλλαγή μεταξύ LoginForm και RegisterForm */}
                {authModalView === 'login' ? (
                    <LoginForm
                        onClose={handleCloseAuthModal}
                        onSwitchToRegister={handleSwitchToRegister}
                    />
                ) : (
                    <RegisterForm
                        onClose={handleCloseAuthModal}
                        onSwitchToLogin={handleSwitchToLogin}
                    />
                )}
            </Modal>
        </>
    );
}
