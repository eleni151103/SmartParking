/**
 * =======================================================================
 * LoginForm.tsx - Φόρμα Σύνδεσης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει τη φόρμα login (email + password) και διαχειρίζεται
 *   την επαλήθευση στοιχείων και το API call σύνδεσης.
 *
 * ΡΟΗΛ SUBMIT:
 *   1. Χρήστης κλικάρει "Sign In"
 *   2. handleSubmit κλείνει το default browser submit
 *   3. validateLoginForm ελέγχει email/password (client-side)
 *   4. authService.login() στέλνει στο backend
 *   5. Επιτυχία: login() από AuthContext αποθηκεύει χρήστη
 *   6. Αποτυχία: εμφανίζουμε error messages
 *
 * CONTROLLED COMPONENTS:
 *   Κάθε input έχει value={formData.email} και onChange={handleChange}.
 *   Αυτό σημαίνει ότι το React "ελέγχει" την τιμή (controlled component).
 *   Κάθε πάτημα πλήκτρου → handleChange → setFormData → re-render.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   LandingPage.tsx, AuthContext.tsx, authService.ts, userValidation.ts
 * =======================================================================
 */

import React, { useState } from 'react';
import type { LoginFormData } from '../../types/user';
import { validateLoginForm } from '../../validation/userValidation';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

/** Props: τι παίρνει το component από τον γονέα */
interface LoginFormProps {
  onClose: () => void;              // Κλείνει modal (αν χρησιμοποιείται ως modal)
  onSwitchToRegister: () => void;   // Μεταβαίνει στη φόρμα εγγραφής
}

export const LoginForm: React.FC<LoginFormProps> = ({ onClose, onSwitchToRegister }) => {
  // login: συνάρτηση από AuthContext για αποθήκευση του χρήστη μετά login
  const { login } = useAuth();

  // formData: τα δεδομένα της φόρμας (email + password)
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  // errors: λίστα μηνυμάτων σφαλμάτων (validation ή API errors)
  const [errors, setErrors] = useState<string[]>([]);

  // isLoading: true ενώ περιμένουμε απάντηση από το server
  const [isLoading, setIsLoading] = useState(false);

  /**
   * handleChange - Ενημερώνει το formData όταν ο χρήστης πληκτρολογεί.
   *
   * [name]: value - computed property name: ενημερώνει μόνο το πεδίο που άλλαξε
   * π.χ. name="email" → { ...prev, email: value }
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Spread operator: αντιγράφει παλιές τιμές και αλλάζει μόνο το name
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Καθαρισμός errors μόλις ο χρήστης αρχίσει να πληκτρολογεί
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  /**
   * handleSubmit - Εκτελείται όταν ο χρήστης κλικάρει "Sign In".
   *
   * e.preventDefault(): αποτρέπει τον browser να κάνει full page reload
   * (το default συμπεριφορά των HTML forms)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // Αποτρέπουμε το reload

    // Βήμα 1: Client-side validation (πριν στείλουμε στον server)
    const validation = validateLoginForm(formData.email, formData.password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;  // Δεν συνεχίζουμε αν υπάρχουν σφάλματα
    }

    setIsLoading(true);  // Εμφάνιση "Signing in..."
    setErrors([]);

    try {
      // Βήμα 2: API call στο backend
      const user = await authService.login(formData);

      // Βήμα 3: Αποθήκευση χρήστη στο global state
      login(user);  // AuthContext.login() → localStorage + state update

      // Βήμα 4: Κλείσιμο modal (αν χρησιμοποιείται)
      onClose();
    } catch (error) {
      // Εμφάνιση σφάλματος (π.χ. "Invalid credentials")
      setErrors([error instanceof Error ? error.message : 'Login failed. Please try again.']);
    } finally {
      setIsLoading(false);  // Επαναφορά κουμπιού
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Εμφάνιση σφαλμάτων αν υπάρχουν */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Πεδίο email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="your@email.com"
          required
        />
      </div>

      {/* Πεδίο password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="••••••••"
          required
        />
      </div>

      {/* Κουμπί submit - disabled ενώ φορτώνει */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {/* Ternary operator: αλλάζει κείμενο ανάλογα με loading state */}
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      {/* Link για μετάβαση στην εγγραφή */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Not a member?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Register now
        </button>
      </div>
    </form>
  );
};
