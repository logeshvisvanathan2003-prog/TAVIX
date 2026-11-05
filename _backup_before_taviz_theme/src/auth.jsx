import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken } from "./api";
import { removeStored, setStored } from "./storage.js";
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { (getToken() ? api("/auth/me").then(setUser).catch(() => removeStored("tavix_token")) : Promise.resolve()).finally(() => setReady(true)); }, []);
  const sign = async (path, body) => { const r = await api(path, { method: "POST", body }); setStored("tavix_token", r.token); setUser(r.user); return r.user; };
  const logout = () => { removeStored("tavix_token"); setUser(null); };
  return <Ctx.Provider value={{ user, ready, login: (b) => sign("/auth/login", b), adminLogin: (b) => sign("/auth/admin-login", b), register: (b) => sign("/auth/register", b), logout }}>{children}</Ctx.Provider>;
}
