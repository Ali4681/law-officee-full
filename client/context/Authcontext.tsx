import {
  loadAuthToken,
  setAuthToken,
  subscribeAuthToken,
} from "@/services/api";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    return subscribeAuthToken((token) => {
      setIsAuthenticated(!!token);
      setIsLoading(false);
    });
  }, []);

  const checkAuth = async () => {
    try {
      console.log("Checking auth status...");
      const token = await loadAuthToken();
      const isAuth = !!token;

      console.log("Auth status:", isAuth ? "Authenticated" : "Not authenticated");

      setIsAuthenticated(isAuth);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    console.log("Logging in...");
    await setAuthToken(token);
    setIsAuthenticated(true);
    console.log("Logged in successfully");
  };

  const logout = async () => {
    console.log("Logging out...");
    await setAuthToken(null);
    setIsAuthenticated(false);
    console.log("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
