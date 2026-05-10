

import { useState } from 'react';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';

export default function LandingPage() {

    const [isLogin, setIsLogin] = useState(true);

    return (


        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            {}
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                {}
                <div className="text-center">
                    <img
                        src="/smart-parking-logo.png"
                        alt="Smart Parking Logo"
                        className="mx-auto h-24 w-auto mb-6 object-contain"
                    />
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        Smart Parking
                    </h1>
                    {}
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? 'Sign in to access real-time parking' : 'Create an account to get started'}
                    </p>
                </div>

                {}
                {isLogin ? (
                    <LoginForm
                        onClose={() => { }}
                        onSwitchToRegister={() => setIsLogin(false)}
                    />
                ) : (
                    <RegisterForm
                        onClose={() => { }}
                        onSwitchToLogin={() => setIsLogin(true)}
                    />
                )}
            </div>
        </div>
    );
}
