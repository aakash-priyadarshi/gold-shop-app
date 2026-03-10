"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;         // ADMIN, MANAGER, TEAM_LEAD, AGENT, INTERN
  employeeCode: string;
  department: string;
  avatarUrl?: string;
}

interface AuthContextType {
  employee: Employee | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  employee: null,
  isLoading: true,
  isAuthenticated: false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEmployee = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      const stored = localStorage.getItem("employee");
      if (!token || !stored) {
        setEmployee(null);
        setIsLoading(false);
        return;
      }

      // Check token expiration
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("employee");
        setEmployee(null);
      } else {
        setEmployee(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("employee");
      setEmployee(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  useEffect(() => {
    const handle = () => loadEmployee();
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, [loadEmployee]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("employee");
    setEmployee(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        employee,
        isLoading,
        isAuthenticated: !!employee,
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
