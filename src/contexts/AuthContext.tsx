// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/firebase"; // <-- asegúrate de exportar db (getFirestore) en tu setup
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type Role = "admin" | "employee";
type AccessDoc = { email: string; role: Role; active?: boolean; displayName?: string };

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};

// Configuración
const ACL_COLLECTION = "access";
// Cambia por la URL a donde quieres expulsar a los no autorizados
const NO_ACCESS_URL = "/";

const emailId = (email?: string | null) => (email || "").trim().toLowerCase();

async function fetchAccess(email: string): Promise<AccessDoc | null> {
  if (!email) return null;
  const ref = doc(db, ACL_COLLECTION, emailId(email));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AccessDoc;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Construye el User del contexto si está en la ACL
  const buildUser = (fbUser: any, access: AccessDoc): User => ({
    id: fbUser.uid,
    name: fbUser.displayName || access.displayName || "",
    email: fbUser.email || access.email,
    picture: fbUser.photoURL || "",
    role: access.role,
  });

  // Maneja el caso "no autorizado": signOut + redirect
  const handleNoAccess = async () => {
    try { await fbSignOut(auth); } catch { }
    setUser(null);
    // Redirección dura fuera de la app
    window.location.replace(NO_ACCESS_URL);
  };

  // Observa sesión y verifica ACL
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          return;
        }
        const email = fbUser.email || "";
        const access = await fetchAccess(email);
        // Si no está en la lista o está inactivo: expulsar
        if (!access || access.active === false) {
          await handleNoAccess();
          return;
        }
        setUser(buildUser(fbUser, access));
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Google Sign-In → luego verificamos ACL
  const signIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const res = await signInWithPopup(auth, provider);
      // aquí onAuthStateChanged se encarga de consultar la ACL y setear/expulsar
      await res.user.getIdToken(true); // refresca token (buena práctica)
    } catch (e) {
      console.error("Error en signIn:", e);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (e) {
      console.error("Error en signOut:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
};
