import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken, getToken } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) return setReady(true);

    api.me()
      .then((res) => setUser(res.user))
      .catch(() => { setToken(""); setUser(null); })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    async login(email, password) {
      const res = await api.login({ email, password });
      setToken(res.access_token);
      setUser(res.user);
      return res.user;
    },
    logout() {
      setToken("");
      setUser(null);
    }
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
