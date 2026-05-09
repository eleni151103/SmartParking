/**
 * =======================================================================
 * userValidation.ts - Επαλήθευση Φορμών Χρηστών
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει συναρτήσεις ελέγχου εγκυρότητας για τα πεδία φορμών.
 *   Ελέγχει αν email, κωδικός, όνομα είναι σωστά ΠΡΙΝ σταλούν στον server.
 *
 * ΓΙΑΤΙ VALIDATION ΣΤΟΝ CLIENT:
 *   Δύο λόγοι:
 *   1. Ταχύτητα: ο χρήστης βλέπει σφάλματα ΑΜΕΣΩΣ χωρίς να περιμένει
 *      απάντηση από τον server
 *   2. Εμπειρία χρήστη (UX): πιο φιλικά μηνύματα σφάλματος
 *
 *   ΣΗΜΑΝΤΙΚΟ: Ο server επίσης επαλήθεύει - δεν βασιζόμαστε ΜΟΝΟ
 *   στον client (κάποιος μπορεί να παρακάμψει το frontend).
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   LoginForm.tsx, RegisterForm.tsx, ChangePasswordForm.tsx
 * =======================================================================
 */

/**
 * ValidationResult - Αποτέλεσμα επαλήθευσης.
 * isValid: true αν ΔΕΝ υπάρχουν σφάλματα
 * errors: λίστα μηνυμάτων σφαλμάτων (άδεια αν isValid=true)
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * validateEmail - Ελέγχει αν το email έχει σωστή μορφή.
 *
 * ΤΙ ΚΑΝΕΙ: Ελέγχει ότι το email δεν είναι κενό και έχει μορφή x@y.z
 * ΠΑΡΑΜΕΤΡΟΙ: email - το email προς έλεγχο
 * ΕΠΙΣΤΡΕΦΕΙ: ValidationResult με isValid και errors
 *
 * REGEX ΕΠΕΞΗΓΗΣΗ:
 *   /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *   ^ = αρχή string
 *   [^\s@]+ = 1+ χαρακτήρες που δεν είναι κενό ή @
 *   @ = το @
 *   [^\s@]+ = domain (π.χ. gmail)
 *   \. = τελεία
 *   [^\s@]+ = .com, .gr κτλ.
 *   $ = τέλος string
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * validatePassword - Ελέγχει αν ο κωδικός πληροί τις απαιτήσεις.
 *
 * ΤΙ ΚΑΝΕΙ: Ελέγχει μήκος (≥6) και ότι περιέχει κεφαλαίο γράμμα.
 * ΠΑΡΑΜΕΤΡΟΙ: password - ο κωδικός προς έλεγχο
 * ΕΠΙΣΤΡΕΦΕΙ: ValidationResult
 *
 * ΚΑΝΟΝΕΣ:
 *   - Τουλάχιστον 6 χαρακτήρες
 *   - Τουλάχιστον ένα κεφαλαίο γράμμα
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    // /[A-Z]/.test(password): true αν περιέχει τουλάχιστον ένα A-Z
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * validatePasswordMatch - Ελέγχει αν οι δύο κωδικοί ταιριάζουν.
 *
 * ΤΙ ΚΑΝΕΙ: Συγκρίνει κωδικό και επαλήθευσή του.
 * ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Στις φόρμες εγγραφής και αλλαγής κωδικού.
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: string[] = [];

  if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * validateName - Ελέγχει αν ένα όνομα (πρώτο ή επίθετο) είναι έγκυρο.
 *
 * ΤΙ ΚΑΝΕΙ: Ελέγχει ότι δεν είναι κενό και έχει τουλάχιστον 2 χαρακτήρες.
 * ΠΑΡΑΜΕΤΡΟΙ:
 *   name      - το όνομα προς έλεγχο
 *   fieldName - "First name" ή "Last name" για το μήνυμα σφάλματος
 */
export const validateName = (name: string, fieldName: string): ValidationResult => {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  } else if (name.trim().length < 2) {
    // trim(): αφαιρεί κενά από αρχή και τέλος
    errors.push(`${fieldName} must be at least 2 characters long`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * validateLoginForm - Επαλήθευση ολόκληρης φόρμας login.
 *
 * ΤΙ ΚΑΝΕΙ: Συνδυάζει validation email + password σε ένα αποτέλεσμα.
 * ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: LoginForm.tsx πριν το submit
 */
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: string[] = [];

  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  // spread operator (...): "ξεδιπλώνει" τη λίστα μέσα στη νέα λίστα
  errors.push(...emailValidation.errors, ...passwordValidation.errors);

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * validateRegisterForm - Επαλήθευση ολόκληρης φόρμας εγγραφής.
 *
 * ΤΙ ΚΑΝΕΙ: Ελέγχει όλα τα πεδία της φόρμας εγγραφής.
 * ΠΑΡΑΜΕΤΡΟΙ: Όλα τα πεδία της φόρμας εγγραφής
 * ΕΠΙΣΤΡΕΦΕΙ: Συνδυασμένο ValidationResult
 */
export const validateRegisterForm = (
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: string[] = [];

  // Επαλήθεύουμε κάθε πεδίο ξεχωριστά
  const firstNameValidation = validateName(firstName, 'First name');
  const lastNameValidation = validateName(lastName, 'Last name');
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);

  // Συνδυάζουμε όλα τα σφάλματα σε μια λίστα
  errors.push(
    ...firstNameValidation.errors,
    ...lastNameValidation.errors,
    ...emailValidation.errors,
    ...passwordValidation.errors,
    ...passwordMatchValidation.errors
  );

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * validateChangePasswordForm - Επαλήθευση φόρμας αλλαγής κωδικού.
 *
 * ΤΙ ΚΑΝΕΙ: Ελέγχει ότι ο τρέχων κωδικός δεν είναι κενός,
 *           ο νέος πληροί τους κανόνες, και οι δύο νέοι ταιριάζουν.
 */
export const validateChangePasswordForm = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): ValidationResult => {
  const errors: string[] = [];

  if (!currentPassword) {
    errors.push('Current password is required');
  }

  const passwordValidation = validatePassword(newPassword);
  const passwordMatchValidation = validatePasswordMatch(newPassword, confirmPassword);

  errors.push(...passwordValidation.errors, ...passwordMatchValidation.errors);

  return {
    isValid: errors.length === 0,
    errors
  };
};
