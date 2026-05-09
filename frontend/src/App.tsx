/**
 * =======================================================================
 * App.tsx - Κύριο Component Δρομολόγησης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Αποφασίζει ποιο component να εμφανίσει βάσει:
 *   1. Αν ο χρήστης είναι συνδεδεμένος
 *   2. Ποιο URL path είναι ανοιχτό (π.χ. /admin)
 *
 * ΑΠΛΗ ΔΡΟΜΟΛΟΓΗΣΗ (Routing):
 *   Συνήθως χρησιμοποιούμε react-router-dom για πολύπλοκα apps.
 *   Εδώ χρησιμοποιούμε απλό window.location.pathname έλεγχο
 *   αφού έχουμε μόνο 2 paths (/ και /admin).
 *
 * ΛΟΓΙΚΗ ΑΠΟΦΑΣΗΣ:
 *   Loading...         → Φορτώνει από localStorage
 *   path = /admin      → AdminDashboard (μόνο αν admin)
 *   isAuthenticated    → MainLayout (ο χάρτης)
 *   else               → LandingPage (login/register)
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   AuthContext.tsx, MainLayout.tsx, LandingPage.tsx, AdminDashboard.tsx
 * =======================================================================
 */

import { useAuth } from "./contexts/AuthContext";
import MainLayout from "./components/MainLayout";
import LandingPage from "./components/LandingPage";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {
    // Παίρνουμε κατάσταση authentication από το global context
    const { isAuthenticated, user, loading } = useAuth();

    // Διαβάζουμε το τρέχον URL path (π.χ. "/" ή "/admin")
    const path = window.location.pathname;

    // Φάση φόρτωσης: ελέγχουμε localStorage για αποθηκευμένο χρήστη
    // Δείχνουμε loading ώστε να μην "αναβοσβήνει" η σελίδα
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Αν ο χρήστης πλοηγήθηκε στο /admin
    if (path === '/admin') {
        // Μόνο authenticated admin users μπορούν να δουν το dashboard
        if (!isAuthenticated || !user?.is_admin) {
            // Redirect στη αρχική σελίδα (δεν έχει δικαίωμα)
            window.location.href = '/';
            return null;
        }
        return <AdminDashboard />;
    }

    // Αρχική σελίδα: αν συνδεδεμένος → χάρτης, αλλιώς → landing
    return (
        isAuthenticated ? <MainLayout /> : <LandingPage />
    );
}
