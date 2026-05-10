

import { useEffect, useState } from 'react';


export function useTheme() {


    const [isDark, setIsDark] = useState<boolean>(() => {
        const stored = localStorage.getItem('theme');
        if (stored) return stored === 'dark';
        return false;
    });


    useEffect(() => {

        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    return {
        isDark,


        toggleTheme: () => setIsDark(d => !d)
    };
}
