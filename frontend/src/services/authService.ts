/**
 * =======================================================================
 * authService.ts - Υπηρεσία Αυθεντικοποίησης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Διαχειρίζεται όλες τις API κλήσεις για αυθεντικοποίηση:
 *   login, εγγραφή, αλλαγή κωδικού.
 *   Επίσης διαχειρίζεται αποθήκευση/ανάκτηση του JWT token.
 *
 * ΠΩΣ ΑΠΟΘΗΚΕΥΕΤΑΙ Ο ΧΡΗΣΤΗΣ:
 *   localStorage = μόνιμη αποθήκη του browser (παραμένει μετά κλείσιμο).
 *   Αποθηκεύουμε ολόκληρο το user object (συμπεριλαμβανομένου token)
 *   ως JSON string με κλειδί 'smart_parking_user'.
 *
 * ΓΙΑΤΙ localStorage ΚΑΙ ΟΧΙ COOKIES:
 *   Απλούστερο για SPA (Single Page Applications) - δεν χρειάζεται
 *   server-side cookie handling. Αλλά λιγότερο ασφαλές από HttpOnly cookies.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   AuthContext.tsx (χρησιμοποιεί authService για login/logout),
 *   api.ts (χρησιμοποιεί getAuthHeaders για κάθε request)
 * =======================================================================
 */

import type { User, LoginFormData, RegisterFormData } from '../types/user';

// URL βάσης του backend
const API_BASE_URL = 'http://localhost:8000';

// Κλειδί για αποθήκευση στο localStorage
// Το χρησιμοποιούμε σε πολλά σημεία - καλύτερα σε σταθερά
const USER_STORAGE_KEY = 'smart_parking_user';

/**
 * authService - Object με όλες τις συναρτήσεις αυθεντικοποίησης.
 *
 * ΧΡΗΣΗ: import { authService } from '../services/authService';
 *        await authService.login({ email, password });
 */
export const authService = {

  /**
   * getAuthHeaders - Δημιουργεί τα headers για authenticated requests.
   *
   * ΤΙ ΚΑΝΕΙ: Διαβάζει το JWT token από localStorage και το επιστρέφει
   *           ως Authorization header για τον server.
   * ΕΠΙΣΤΡΕΦΕΙ: Object με headers (Content-Type + Authorization αν υπάρχει token)
   *
   * FORMAT: { 'Authorization': 'Bearer eyJhbGci...' }
   * Ο server αναγνωρίζει το prefix "Bearer " και αποκωδικοποιεί το token.
   */
  getAuthHeaders(): HeadersInit {
    // Διαβάζουμε τον αποθηκευμένο χρήστη από localStorage
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    let token = '';
    if (stored) {
      try {
        // Μετατρέπουμε JSON string → JavaScript object
        const user = JSON.parse(stored);
        token = user.token || '';
      } catch (e) { console.error('Error parsing user for token', e); }
    }
    return {
      'Content-Type': 'application/json',
      // Προσθέτουμε Authorization ΜΟΝΟ αν υπάρχει token
      // Spread operator (...): αν token δεν υπάρχει, δεν προστίθεται το πεδίο
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  /**
   * login - Σύνδεση χρήστη με email και κωδικό.
   *
   * ΤΙ ΚΑΝΕΙ: Στέλνει credentials στο backend, λαμβάνει JWT token.
   * ΠΑΡΑΜΕΤΡΟΙ: data - { email, password }
   * ΕΠΙΣΤΡΕΦΕΙ: User object με ενσωματωμένο token
   * ΠΕΤΑΕΙ ΣΦΑΛΜΑ: Αν τα credentials είναι λάθος (401)
   *
   * ΡΟΗΛ:
   * 1. POST /api/users/login με email + password
   * 2. Backend επιστρέφει: { access_token, token_type, user }
   * 3. Συγχωνεύουμε token μέσα στο user object
   * 4. Επιστρέφουμε user (θα αποθηκευτεί από AuthContext)
   */
  async login(data: LoginFormData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),  // { email, password } → JSON string
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const resData = await response.json();
    // Backend επιστρέφει: { access_token: "...", token_type: "bearer", user: {...} }
    // Συγχωνεύουμε το token μέσα στο user object με spread operator
    const userWithToken: User = { ...resData.user, token: resData.access_token };
    return userWithToken;
  },

  /**
   * register - Εγγραφή νέου χρήστη.
   *
   * ΤΙ ΚΑΝΕΙ: Δημιουργεί νέο λογαριασμό στο backend.
   * ΠΑΡΑΜΕΤΡΟΙ: data - { firstName, lastName, email, password, confirmPassword }
   * ΕΠΙΣΤΡΕΦΕΙ: User object (χωρίς token - χρειάζεται login μετά)
   *
   * ΣΗΜΕΙΩΣΗ: Ο backend δέχεται full_name (όχι firstName/lastName ξεχωριστά).
   * Οπότε συνενώνουμε: "Κώστας" + " " + "Παπαδόπουλος" = "Κώστας Παπαδόπουλος"
   */
  async register(data: RegisterFormData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        // Συνενώνουμε firstName + lastName σε full_name
        full_name: `${data.firstName} ${data.lastName}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    // Η εγγραφή επιστρέφει μόνο τον χρήστη (χωρίς token)
    // Ο χρήστης χρειάζεται να κάνει login μετά για να πάρει token
    return response.json();
  },

  /**
   * changePassword - Αλλαγή κωδικού χρήστη.
   *
   * ΤΙ ΚΑΝΕΙ: Στέλνει νέο κωδικό στον server (PUT /api/users/{id}).
   * ΠΑΡΑΜΕΤΡΟΙ:
   *   userId          - το id του χρήστη
   *   _currentPassword - ο τρέχων κωδικός (δεν στέλνεται - ο server δεν το ελέγχει)
   *   newPassword     - ο νέος κωδικός
   * ΕΠΙΣΤΡΕΦΕΙ: Ενημερωμένο User object
   *
   * ΣΗΜΕΙΩΣΗ: Το _ πριν από _currentPassword σημαίνει "αχρησιμοποίητη παράμετρος"
   * (convention στο TypeScript). Ο server δεν επαληθεύει τον παλιό κωδικό εδώ.
   */
  async changePassword(
    userId: number,
    _currentPassword: string,
    newPassword: string
  ): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),  // Χρειάζεται authentication
      body: JSON.stringify({
        password: newPassword,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Password change failed');
    }

    return response.json();
  },

  /**
   * isAuthenticated - Ελέγχει αν ο χρήστης είναι συνδεδεμένος.
   *
   * ΤΙ ΚΑΝΕΙ: Ελέγχει αν υπάρχει αποθηκευμένος χρήστης στο localStorage.
   * ΕΠΙΣΤΡΕΦΕΙ: true αν υπάρχει αποθηκευμένος χρήστης
   *
   * ΣΗΜΕΙΩΣΗ: Δεν επαληθεύει αν το token έχει λήξει - απλός έλεγχος ύπαρξης.
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(USER_STORAGE_KEY);
    // !! μετατρέπει οτιδήποτε σε boolean: null → false, "..." → true
  },
};
