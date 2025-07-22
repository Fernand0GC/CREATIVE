import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Google Identity Services
  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (typeof window !== 'undefined' && window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id',
          callback: handleCredentialResponse,
        });
        setLoading(false);
      } else {
        // Fallback for demo purposes
        setLoading(false);
      }
    };

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleAuth;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = (response: any) => {
    try {
      // In a real app, you would verify the JWT token on your backend
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      const userData: User = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        isAdmin: payload.email === 'admin@example.com' // Demo admin check
      };
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error parsing credential:', error);
    }
  };

  const signIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      // Demo login for development
      const demoUser: User = {
        id: 'demo-user',
        name: 'Usuario Demo',
        email: 'demo@portal-sync.com',
        picture: 'https://via.placeholder.com/96',
        isAdmin: true
      };
      setUser(demoUser);
      localStorage.setItem('user', JSON.stringify(demoUser));
    }
  };

  const signOut = () => {
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Declare global types for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}