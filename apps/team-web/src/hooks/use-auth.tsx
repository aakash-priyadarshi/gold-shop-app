"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const ALLOWED_ROLES = ["ADMIN", "SUPPORT", "SALES"];

interface User {
  id: string;
  email: string;
  role: string; // ADMIN, SUPPORT, SALES
  firstName?: string;
  lastName?: string;
  shopId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));

      // Check expiration
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
      } else if (!ALLOWED_ROLES.includes(payload.role)) {
        // Not an employee role — reject
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
      } else {
        setUser({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          shopId: payload.shopId,
        });
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const handle = () => loadUser();
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [loadUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
