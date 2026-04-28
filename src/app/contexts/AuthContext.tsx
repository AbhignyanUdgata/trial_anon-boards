import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authAPI, User } from '../utils/api';

interface AuthContextType {
  user: User | null;
  anonId: string;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function generateAnonId(): string {
  const adjectives = ['Swift', 'Silent', 'Mystic', 'Noble', 'Clever', 'Bold', 'Wise', 'Quick', 'Gentle', 'Brave'];
  const nouns = ['Fox', 'Wolf', 'Eagle', 'Lion', 'Bear', 'Tiger', 'Hawk', 'Owl', 'Raven', 'Falcon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `ANON_${adj}${noun}_${num}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [anonId, setAnonId] = useState<string>('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    let savedAnonId = localStorage.getItem('anonId');
    if (!savedAnonId) {
      savedAnonId = generateAnonId();
      localStorage.setItem('anonId', savedAnonId);
    }
    setAnonId(savedAnonId);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.username) return;
    try {
      const res = await authAPI.getProfile(user.username);
      if (res.user) {
        const updated = { ...user, ...res.user };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to refresh profile', err);
    }
  }, [user]);

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    if (response.success) {
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    } else {
      throw new Error(response.error || 'Login failed');
    }
  };

  const register = async (username: string, password: string) => {
    const response = await authAPI.register(username, password);
    if (response.success) {
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    const newAnonId = generateAnonId();
    setAnonId(newAnonId);
    localStorage.setItem('anonId', newAnonId);
  };

  return (
    <AuthContext.Provider value={{ user, anonId, isAuthenticated: !!user, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
