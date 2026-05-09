/**
 * =======================================================================
 * main.tsx - Σημείο Εκκίνησης του React Frontend
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Είναι το πρώτο αρχείο που εκτελείται όταν φορτώνει η εφαρμογή.
 *   "Προσαρτά" (mounts) ολόκληρη την React εφαρμογή στο HTML.
 *
 * ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ Η REACT:
 *   Στο index.html υπάρχει: <div id="root"></div>
 *   Το React "πιάνει" αυτό το κενό div και βάζει ΟΛΗ την εφαρμογή μέσα.
 *   Αυτό ονομάζεται "Single Page Application" (SPA).
 *
 * ΔΟΜΗ PROVIDERS:
 *   AuthProvider τυλίγει το App για να είναι διαθέσιμη η κατάσταση
 *   σύνδεσης σε ολόκληρη την εφαρμογή.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   App.tsx (κύριο component), AuthContext.tsx (global auth state)
 * =======================================================================
 */

import { createRoot } from 'react-dom/client'
import './index.css'        // Global CSS styles
import App from './App.tsx' // Κύριο component της εφαρμογής
import './styles/tailwind.css'; // TailwindCSS utility classes
import { AuthProvider } from './contexts/AuthContext'; // Global auth context

// createRoot: δημιουργεί React root στο div με id="root" του index.html
// document.getElementById('root')!: ! = σίγουροι ότι υπάρχει (non-null assertion)
createRoot(document.getElementById('root')!).render(
    // AuthProvider: τυλίγει ΟΛΗ την εφαρμογή ώστε τα auth δεδομένα
    // να είναι διαθέσιμα σε κάθε component (μέσω useAuth())
    <AuthProvider>
        <App />
    </AuthProvider>
);
