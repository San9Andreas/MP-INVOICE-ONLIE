import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isOwner: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = 'invoice_app_users';
const SESSION_KEY = 'invoice_app_session';

interface StoredUser extends User {
  password: string;
}

function getStoredUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem(USERS_KEY);
    if (data) return JSON.parse(data);
  } catch { /* empty */ }

  const defaults: StoredUser[] = [
    { id: 'owner-001', email: 'owner@invoice.app', name: 'Alex Morgan', role: 'owner', password: 'owner123' },
    { id: 'staff-001', email: 'staff@invoice.app', name: 'Jordan Lee', role: 'staff', password: 'staff123' },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const users = getStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { success: false, error: 'Invalid email or password' };
    const { password: _, ...userData } = found;
    void _;
    setUser(userData);
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    const users = getStoredUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already registered' };
    }
    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      email,
      name,
      role,
      password,
    };
    users.push(newUser);
    saveUsers(users);
    const { password: _, ...userData } = newUser;
    void _;
    setUser(userData);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      isOwner: user?.role === 'owner',
      isStaff: user?.role === 'staff',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
