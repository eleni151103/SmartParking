

import { useAuth } from "./contexts/AuthContext";
import MainLayout from "./components/MainLayout";
import LandingPage from "./components/LandingPage";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {

    const { isAuthenticated, user, loading } = useAuth();


    const path = window.location.pathname;


    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }


    if (path === '/admin') {

        if (!isAuthenticated || !user?.is_admin) {

            window.location.href = '/';
            return null;
        }
        return <AdminDashboard />;
    }


    return (
        isAuthenticated ? <MainLayout /> : <LandingPage />
    );
}
