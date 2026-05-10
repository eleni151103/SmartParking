

import type { User, LoginFormData, RegisterFormData } from '../types/user';


const API_BASE_URL = 'http://localhost:8000';


const USER_STORAGE_KEY = 'smart_parking_user';


export const authService = {


  getAuthHeaders(): HeadersInit {

    const stored = localStorage.getItem(USER_STORAGE_KEY);
    let token = '';
    if (stored) {
      try {

        const user = JSON.parse(stored);
        token = user.token || '';
      } catch (e) { console.error('Error parsing user for token', e); }
    }
    return {
      'Content-Type': 'application/json',


      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },


  async login(data: LoginFormData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const resData = await response.json();


    const userWithToken: User = { ...resData.user, token: resData.access_token };
    return userWithToken;
  },


  async register(data: RegisterFormData): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,

        full_name: `${data.firstName} ${data.lastName}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }


    return response.json();
  },


  async changePassword(
    userId: number,
    _currentPassword: string,
    newPassword: string
  ): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
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


  isAuthenticated(): boolean {
    return !!localStorage.getItem(USER_STORAGE_KEY);

  },
};
