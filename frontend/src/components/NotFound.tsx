

import React from 'react';

const NotFound: React.FC = () => {
    return (

        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {}
            <h1 className="text-6xl font-bold mb-4 text-blue-600">404</h1>
            <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
            <p className="text-lg mb-8 text-center max-w-md text-gray-600 dark:text-gray-400">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            {}
            <a
                href="/"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg"
            >
                Go to Homepage
            </a>
        </div>
    );
};

export default NotFound;
