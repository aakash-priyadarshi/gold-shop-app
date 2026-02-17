"use client";

import { api } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// Types matching backend
export type UserRole = "ADMIN" | "SHOPKEEPER" | "CUSTOMER" | "SALES" | "SUPPORT";

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
  phoneVerifiedAt?: string;
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
  login: (
    email: string,
    password: string,
    turnstileToken?: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  verifyEmail: (userId: string, code: string) => Promise<void>;
  resendVerificationOtp: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
  googleLogin: (
    role?: "CUSTOMER" | "SHOPKEEPER",
    mode?: "login" | "register",
  ) => void;
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
  turnstileToken?: string;
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

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
  requiresVerification: boolean;
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
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

const getStoredToken = () => {
  if (typeof window === "undefined") return null;
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
    case "ADMIN":
      return "/dashboard/admin";
    case "SHOPKEEPER":
      return "/dashboard/shop";
    case "CUSTOMER":
      return "/dashboard/customer";
    case "SALES":
      return "/dashboard/sales";
    case "SUPPORT":
      return "/dashboard/support";
    default:
      return "/";
  }
};

// Routes allowed per role
const roleRoutes: Record<UserRole, string[]> = {
  ADMIN: ["/dashboard/admin", "/admin", "/api/admin"],
  SHOPKEEPER: ["/dashboard/shop", "/shop", "/inventory"],
  CUSTOMER: ["/dashboard/customer", "/browse", "/cart", "/orders", "/rfq"],
  SALES: ["/dashboard/sales", "/dashboard/admin"],
  SUPPORT: ["/dashboard/support", "/dashboard/admin"],
};

// Public routes that don't require auth
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/register",
  "/browse",
  "/pricing",
];

export const isRouteAllowedForRole = (
  pathname: string,
  role: UserRole,
): boolean => {
  // Public routes are always allowed
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith(r))) {
    return true;
  }

  // Check if route is in role's allowed routes
  const allowed = roleRoutes[role];
  return allowed.some((route) => pathname.startsWith(route));
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
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.get("/auth/me");
      const user = response.data;

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error("Failed to fetch user:", error);
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
  const login = useCallback(
    async (
      email: string,
      password: string,
      turnstileToken?: string,
      rememberMe?: boolean,
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await api.post<AuthResponse & { isSuspended?: boolean }>("/auth/login", {
          email,
          password,
          turnstileToken,
          rememberMe: rememberMe ?? false,
        });

        const { accessToken, refreshToken, user: userData, isSuspended } = response.data;
        storeTokens(accessToken, refreshToken);

        // Fetch full user profile
        const meResponse = await api.get("/auth/me");
        const fullUser = meResponse.data;

        setState({
          user: fullUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Redirect to appropriate dashboard
        // Check if shopkeeper needs to complete shop setup first
        if (fullUser.role === "SHOPKEEPER" && !fullUser.shop?.id) {
          router.push("/auth/complete-shop-setup");
        } else {
          const dashboardRoute = getDashboardRoute(fullUser.role);
          router.push(dashboardRoute);
        }
      } catch (error: any) {
        // Check if email is not verified
        const errorData = error.response?.data;
        if (errorData?.code === "EMAIL_NOT_VERIFIED") {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
          }));
          // Throw structured error for handling in UI
          const verificationError = new Error("EMAIL_NOT_VERIFIED") as any;
          verificationError.userId = errorData.userId;
          verificationError.email = errorData.email;
          throw verificationError;
        }

        const message = errorData?.message || "Login failed. Please try again.";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }
    },
    [router],
  );

  // Register function - returns registration response (requires email verification)
  const register = useCallback(
    async (data: RegisterData): Promise<RegisterResponse> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await api.post<RegisterResponse>(
          "/auth/register",
          data,
        );

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));

        return response.data;
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Registration failed. Please try again.";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }
    },
    [],
  );

  // Verify email with OTP - completes registration and logs user in
  const verifyEmail = useCallback(
    async (userId: string, code: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await api.post<AuthResponse>("/auth/verify-email", {
          userId,
          code,
        });

        const { accessToken, refreshToken, user: userData } = response.data;
        storeTokens(accessToken, refreshToken);

        // Fetch full user profile
        const meResponse = await api.get("/auth/me");
        const fullUser = meResponse.data;

        setState({
          user: fullUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Redirect to appropriate dashboard
        // Check if shopkeeper needs to complete shop setup first
        if (fullUser.role === "SHOPKEEPER" && !fullUser.shop?.id) {
          router.push("/auth/complete-shop-setup");
        } else {
          const dashboardRoute = getDashboardRoute(fullUser.role);
          router.push(dashboardRoute);
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Verification failed. Please try again.";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }
    },
    [router],
  );

  // Resend verification OTP
  const resendVerificationOtp = useCallback(async (email: string) => {
    try {
      await api.post("/auth/resend-verification", { email });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Failed to resend code. Please try again.";
      throw new Error(message);
    }
  }, []);

  // Forgot password - request OTP
  const forgotPassword = useCallback(async (email: string) => {
    try {
      await api.post("/auth/forgot-password", { email });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        "Failed to send reset code. Please try again.";
      throw new Error(message);
    }
  }, []);

  // Reset password with OTP
  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      try {
        await api.post("/auth/reset-password", { email, code, newPassword });
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          "Password reset failed. Please try again.";
        throw new Error(message);
      }
    },
    [],
  );

  // Google OAuth login - redirects to backend OAuth endpoint with role and mode
  const googleLogin = useCallback(
    (
      role: "CUSTOMER" | "SHOPKEEPER" = "CUSTOMER",
      mode: "login" | "register" = "login",
    ) => {
      // Use getApiUrl to get the correct base URL with /api
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      // Ensure we have /api in the path
      const baseUrl = apiBaseUrl.endsWith("/api")
        ? apiBaseUrl
        : `${apiBaseUrl}/api`;
      // Pass role and mode as query params so backend knows what type of account to create
      // mode='login' - requires existing account, redirects to register if not found
      // mode='register' - creates account if not exists
      window.location.href = `${baseUrl}/auth/google?role=${role}&mode=${mode}`;
    },
    [],
  );

  // Logout function
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      await api.post("/auth/logout", { refreshToken });
    } catch (error) {
      console.error("Logout error:", error);
    }

    clearTokens();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    router.push("/auth/login");
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    verifyEmail,
    resendVerificationOtp,
    forgotPassword,
    resetPassword,
    googleLogin,
    logout,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[],
) {
  return function ProtectedRoute(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push("/auth/login");
        } else if (user?.role === "SHOPKEEPER" && !user.shop?.id) {
          // Shopkeeper without shop must complete setup
          router.push("/auth/complete-shop-setup");
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

    // Shopkeeper without shop should not render protected content
    if (user?.role === "SHOPKEEPER" && !user.shop?.id) {
      return null;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}
