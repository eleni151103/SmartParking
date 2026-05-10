

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './styles/tailwind.css';
import { AuthProvider } from './contexts/AuthContext';


createRoot(document.getElementById('root')!).render(


    <AuthProvider>
        <App />
    </AuthProvider>
);
