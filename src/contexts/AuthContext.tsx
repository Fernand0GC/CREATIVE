import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AUTHORIZED_EMAILS = [
  'admin1@tudominio.com',
  'admin2@tudominio.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          picture: firebaseUser.photoURL || '',
          isAdmin: AUTHORIZED_EMAILS.includes(firebaseUser.email || ''),
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userData: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || '',
        isAdmin: AUTHORIZED_EMAILS.includes(firebaseUser.email || ''),
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error signing in:', error);
    }
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    setLoading(false);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};