import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser, registerUser } from "../services/api";

const TOKEN_KEY = "examvault_access_token";
const USER_KEY = "examvault_user";

const AuthContext = createContext(null);

function navigateTo(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Keep auth usable when browser storage is unavailable.
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(getStoredToken);
  // Optimistic instant hydration from local storage (0ms blank screen)
  const [user, setUser] = useState(getStoredUser);
  const [isInitializing, setIsInitializing] = useState(() => !getStoredUser() && Boolean(getStoredToken()));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initAuth() {
      if (!accessToken) {
        if (active) setIsInitializing(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(accessToken);
        if (active) {
          setUser(currentUser);
          storeUser(currentUser);
        }
      } catch {
        storeToken(null);
        storeUser(null);
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) setIsInitializing(false);
      }
    }

    initAuth();
    return () => { active = false; };
  }, [accessToken]);

  const login = async (email, password) => {
    setError("");
    const tokenResponse = await loginUser({ email, password });
    storeToken(tokenResponse.access_token);
    setAccessToken(tokenResponse.access_token);
    // Use user directly from backend response to avoid second sequential roundtrip
    const currentUser = tokenResponse.user || (await getCurrentUser(tokenResponse.access_token));
    setUser(currentUser);
    storeUser(currentUser);
    navigateTo("/dashboard");
    return currentUser;
  };

  const register = async (email, fullName, password) => {
    setError("");
    await registerUser({ email, full_name: fullName, password });
    await login(email, password);
  };

  const logout = () => {
    storeToken(null);
    storeUser(null);
    setAccessToken(null);
    setUser(null);
    setError("");
    navigateTo("/auth/login");
  };

  const value = useMemo(() => ({
    accessToken,
    user,
    isInitializing,
    error,
    setError,
    login,
    register,
    logout,
  }), [accessToken, user, isInitializing, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

