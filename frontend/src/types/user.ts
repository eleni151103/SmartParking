

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin?: boolean;
  created_at: string;
  token?: string;
}


export interface LoginFormData {
  email: string;
  password: string;
}


export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}


export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
