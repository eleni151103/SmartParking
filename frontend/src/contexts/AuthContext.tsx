

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/user';


interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);


const USER_STORAGE_KEY = 'smart_parking_user';


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  const [user, setUser] = useState<User | null>(null);


  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {

        setUser(JSON.parse(storedUser));
      } catch (error) {

        console.error('Failed to parse stored user:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);


  const login = (user: User) => {
    setUser(user);

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  };


  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };


  const isAuthenticated = user !== null;


  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {

    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
