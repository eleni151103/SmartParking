# Component Architecture

```
main.tsx
└── AuthProvider (Context)
    └── App.tsx
        ├── Header.tsx
        │   ├── UserMenu (when authenticated)
        │   │   └── Modal (Change Password)
        │   │       └── ChangePasswordForm
        │   └── Modal (Login/Register)
        │       ├── LoginForm
        │       └── RegisterForm
        └── Sidebar.tsx
            └── (uses useAuth hook)
```

## Data Flow

### Login/Register Flow:
```
LoginForm/RegisterForm
    → authService (API call)
        → Backend (/users/login or /users/)
            → UserService (validate, hash password)
                → UserRepository (database)
    → useAuth().login()
        → localStorage.setItem()
        → Context state updated
            → UI re-renders (Header shows UserMenu)
```

### Logout Flow:
```
UserMenu
    → useAuth().logout()
        → localStorage.removeItem()
        → Context state cleared
            → UI re-renders (Header shows Login button)
```

### Change Password Flow:
```
ChangePasswordForm
    → authService.changePassword()
        → Backend (/users/{id})
            → UserService (hash new password)
                → UserRepository (update database)
    → Success message
        → Modal auto-closes
```

## State Management

### AuthContext State:
```typescript
{
  user: User | null,          // Current logged-in user
  isAuthenticated: boolean,   // Derived from user
  login: (user) => void,      // Sets user + saves to localStorage
  logout: () => void          // Clears user + removes from localStorage
}
```

### localStorage:
```typescript
// Key: 'smart_parking_user'
// Value: JSON.stringify(user)
{
  id: number,
  email: string,
  full_name: string,
  created_at: string
}
```

## Component Props

### Header
```typescript
{
  isDark: boolean,
  toggleTheme: () => void
}
// No longer needs isAuthenticated - uses useAuth()
```

### Sidebar
```typescript
{
  spots: ParkingSpot[],
  userCoords?: { lat, lng },
  isOpen?: boolean,
  onClose?: () => void,
  selectedTab: Tab,
  onChangeTab: (t: Tab) => void
}
// No longer needs isAuthenticated - uses useAuth()
```

### UserMenu
```typescript
// No props - uses useAuth() internally
```

### Forms
```typescript
LoginForm: {
  onClose: () => void,
  onSwitchToRegister: () => void
}

RegisterForm: {
  onClose: () => void,
  onSwitchToLogin: () => void
}

ChangePasswordForm: {
  onClose: () => void
}
```
