'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  ReactNode 
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

// Types matching backend
export type UserRole = 'ADMIN' | 'SHOPKEEPER' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  preferredLanguage: string;
  preferredCurrency: string;
  themeMode: string;
  emailVerifiedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
  shop?: {
    id: string;
    shopName: string;
    country: string;
    city: string;
    isVerified: boolean;
    isActive: boolean;
    makingChargePercent?: number;
    isOnHold?: boolean;
    holdReason?: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  preferredLanguage?: string;
  shop?: {
    shopName: string;
    country: string;
    currency?: string;
    city?: string;
    address?: string;
    contactPhone?: string;
    contactEmail?: string;
  };
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    shopId?: string;
    shopName?: string;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token management
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

const storeTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Dashboard routes by role
export const getDashboardRoute = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/dashboard/admin';
    case 'SHOPKEEPER':
      return '/dashboard/shop';
    case 'CUSTOMER':
      return '/dashboard/customer';
    default:
      return '/';
  }
};

// Routes allowed per role
const roleRoutes: Record<UserRole, string[]> = {
  ADMIN: ['/dashboard/admin', '/admin', '/api/admin'],
  SHOPKEEPER: ['/dashboard/shop', '/shop', '/inventory'],
  CUSTOMER: ['/dashboard/customer', '/browse', '/cart', '/orders', '/rfq'],
};

// Public routes that don't require auth
const publicRoutes = ['/', '/auth/login', '/auth/register', '/browse', '/pricing'];

export const isRouteAllowedForRole = (pathname: string, role: UserRole): boolean => {
  // Public routes are always allowed
  if (publicRoutes.some(r => pathname === r || pathname.startsWith(r))) {
    return true;
  }

  // Check if route is in role's allowed routes
  const allowed = roleRoutes[role];
  return allowed.some(route => pathname.startsWith(route));
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const router = useRouter();
  const pathname = usePathname();

  // Fetch current user from /auth/me
  const fetchUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      const user = response.data;
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });

      const { accessToken, refreshToken, user: userData } = response.data;
      storeTokens(accessToken, refreshToken);

      // Fetch full user profile
      const meResponse = await api.get('/api/auth/me');
      const fullUser = meResponse.data;

      setState({
        user: fullUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Redirect to appropriate dashboard
      const dashboardRoute = getDashboardRoute(fullUser.role);
      router.push(dashboardRoute);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw new Error(message);
    }
  }, [router]);

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.post<AuthResponse>('/api/auth/register', data);
      const { accessToken, refreshToken, user: userData } = response.data;
      storeTokens(accessToken, refreshToken);

      // Fetch full user profile
      const meResponse = await api.get('/api/auth/me');
      const fullUser = meResponse.data;

      setState({
        user: fullUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Redirect to appropriate dashboard
      const dashboardRoute = getDashboardRoute(fullUser.role);
      router.push(dashboardRoute);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw new Error(message);
    }
  }, [router]);

  // Logout function
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    try {
      await api.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }

    clearTokens();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    router.push('/auth/login');
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) {
  return function ProtectedRoute(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/auth/login');
        } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
          // Redirect to user's own dashboard if not authorized
          router.push(getDashboardRoute(user.role));
        }
      }
    }, [isAuthenticated, isLoading, user, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}
