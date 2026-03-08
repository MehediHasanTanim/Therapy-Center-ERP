import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
import { authService, LoginInput } from "./authService";
import { authTokenStore } from "../../services/tokenStore";
import { User } from "../../types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (payload: LoginInput) => Promise<void>;
  logout: () => void;
}

const USER_KEY = "therapy_user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      async login(payload) {
        const result = await authService.login(payload);
        authTokenStore.setTokens(result.tokens);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setUser(result.user);
      },
      logout() {
        authTokenStore.clear();
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
