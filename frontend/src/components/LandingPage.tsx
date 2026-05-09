/**
 * =======================================================================
 * LandingPage.tsx - Σελίδα Υποδοχής (Login / Register)
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει τη σελίδα που βλέπουν οι χρήστες που ΔΕΝ είναι συνδεδεμένοι.
 *   Περιέχει εναλλαγή μεταξύ φόρμας login και φόρμας εγγραφής.
 *
 * ΛΟΓΙΚΗ ΕΝΑΛΛΑΓΗΣ:
 *   isLogin = true  → Εμφανίζει LoginForm
 *   isLogin = false → Εμφανίζει RegisterForm
 *   Ο χρήστης μπορεί να αλλάξει κάνοντας κλικ σε "Register now" / "Sign in"
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   App.tsx (καλείται όταν δεν υπάρχει authentication),
 *   LoginForm.tsx, RegisterForm.tsx
 * =======================================================================
 */

import { useState } from 'react';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';

export default function LandingPage() {
    // isLogin: αν true εμφανίζεται login, αν false εμφανίζεται register
    const [isLogin, setIsLogin] = useState(true);

    return (
        // Κεντράρισμα περιεχομένου με Tailwind flex utilities
        // min-h-screen: τουλάχιστον πλήρες ύψος οθόνης
        // dark:bg-gray-900: σκοτεινό φόντο στο dark mode
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            {/* Κάρτα φόρμας - λευκή με σκιά */}
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                {/* Επικεφαλίδα με logo και τίτλο */}
                <div className="text-center">
                    <img
                        src="/smart-parking-logo.png"
                        alt="Smart Parking Logo"
                        className="mx-auto h-24 w-auto mb-6 object-contain"
                    />
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        Smart Parking
                    </h1>
                    {/* Υπότιτλος που αλλάζει ανάλογα με login/register */}
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? 'Sign in to access real-time parking' : 'Create an account to get started'}
                    </p>
                </div>

                {/* Conditional rendering: εμφανίζει την κατάλληλη φόρμα */}
                {isLogin ? (
                    <LoginForm
                        onClose={() => { }}  // Δεν χρειάζεται κλείσιμο (δεν είναι modal)
                        onSwitchToRegister={() => setIsLogin(false)}  // Μεταβαίνει σε register
                    />
                ) : (
                    <RegisterForm
                        onClose={() => { }}  // Δεν χρειάζεται κλείσιμο
                        onSwitchToLogin={() => setIsLogin(true)}  // Μεταβαίνει σε login
                    />
                )}
            </div>
        </div>
    );
}
