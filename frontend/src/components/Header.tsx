

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';
import { UserMenu } from './ui/UserMenu';


type Props = {
    isDark: boolean;
    toggleTheme: () => void;
    onSearchClick: () => void;
    onFavoritesClick: () => void;
    onReservationsClick: () => void;
};


type AuthModalView = 'login' | 'register';

export default function Header({ isDark, toggleTheme, onSearchClick, onFavoritesClick, onReservationsClick }: Props) {
    const { isAuthenticated } = useAuth();


    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);


    const [authModalView, setAuthModalView] = useState<AuthModalView>('login');


    const handleOpenLogin = () => {
        setAuthModalView('login');
        setIsAuthModalOpen(true);
    };


    const handleSwitchToRegister = () => {
        setAuthModalView('register');
    };


    const handleSwitchToLogin = () => {
        setAuthModalView('login');
    };


    const handleCloseAuthModal = () => {
        setIsAuthModalOpen(false);
        setTimeout(() => setAuthModalView('login'), 300);
    };

    return (
        <>
            {}
            <header className="w-full border-b border-gray-300 bg-slate-100 shadow-md dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between px-4 py-3 md:px-6">
                    {}
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

                    {}
                    <div className="flex items-center gap-2 md:gap-4">
                        {}
                        <button
                            onClick={onSearchClick}
                            className="p-2 rounded-full text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Search for parking"
                        >
                            {}
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-white/80 text-gray-700 hover:bg-white transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 shadow-sm"
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {}
                            {isDark ? '☀️' : '🌙'}
                        </button>

                        {}
                        {isAuthenticated ? (

                            <UserMenu onFavoritesClick={onFavoritesClick} onReservationsClick={onReservationsClick} />
                        ) : (

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

            {}
            <Modal
                isOpen={isAuthModalOpen}
                onClose={handleCloseAuthModal}
                title={authModalView === 'login' ? 'Sign In' : 'Create Account'}
            >
                {}
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
