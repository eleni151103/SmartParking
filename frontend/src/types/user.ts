/**
 * =======================================================================
 * user.ts - Τύποι Δεδομένων Χρηστών
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Ορίζει τα TypeScript interfaces για δεδομένα χρηστών και φόρμες.
 *
 * ΤΙ ΕΙΝΑΙ ΤΑ INTERFACES:
 *   Παρόμοια με types, ορίζουν τη "σχήμα" (shape) των δεδομένων.
 *   Χρησιμοποιούμε interface για αντικείμενα και type για πιο σύνθετα.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
 *   Κεντρικό σημείο για τύπους χρηστών - αν αλλάξει η API απόκριση,
 *   αλλάζουμε μόνο εδώ και το TypeScript μας δείχνει τι χρειάζεται fix.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   authService.ts, AuthContext.tsx, LoginForm.tsx, RegisterForm.tsx
 * =======================================================================
 */

/**
 * User - Τα δεδομένα χρήστη όπως επιστρέφονται από το backend.
 *
 * ΣΗΜΕΙΩΣΗ: Το token δεν έρχεται από το backend χωριστά -
 * το συγχωνεύουμε εμείς στο authService μετά το login.
 */
export interface User {
  id: number;             // Μοναδικό αναγνωριστικό
  email: string;          // Email (χρησιμοποιείται για login)
  full_name: string;      // Πλήρες όνομα (firstName + lastName)
  is_admin?: boolean;     // Αν είναι διαχειριστής (προαιρετικό)
  created_at: string;     // Πότε δημιουργήθηκε ο λογαριασμός (ISO string)
  token?: string;         // JWT token για authentication (προαιρετικό)
}

/**
 * LoginFormData - Τα δεδομένα από τη φόρμα login.
 * Χρησιμοποιείται από LoginForm.tsx και authService.login()
 */
export interface LoginFormData {
  email: string;     // Email χρήστη
  password: string;  // Κωδικός (δεν αποθηκεύεται ποτέ - στέλνεται μόνο στο API)
}

/**
 * RegisterFormData - Τα δεδομένα από τη φόρμα εγγραφής.
 * ΣΗΜΕΙΩΣΗ: Ο backend δέχεται full_name (firstName + lastName),
 * οπότε το authService.register() τα συνενώνει πριν στείλει.
 */
export interface RegisterFormData {
  firstName: string;       // Όνομα
  lastName: string;        // Επίθετο
  email: string;           // Email
  password: string;        // Νέος κωδικός
  confirmPassword: string; // Επαλήθευση κωδικού (ελέγχεται στο validation)
}

/**
 * ChangePasswordFormData - Τα δεδομένα από τη φόρμα αλλαγής κωδικού.
 * Χρησιμοποιείται από ChangePasswordForm.tsx
 */
export interface ChangePasswordFormData {
  currentPassword: string; // Τρέχων κωδικός (για επαλήθευση ταυτότητας)
  newPassword: string;     // Νέος κωδικός
  confirmPassword: string; // Επαλήθευση νέου κωδικού
}
