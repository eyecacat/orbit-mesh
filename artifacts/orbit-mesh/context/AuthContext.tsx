import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from 'expo-crypto';
import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  quizScore: number;
  quizAttempts: number;
  rank: number;
  joinedAt: string;
  streak: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = "@orbit-mesh/users";
const CURRENT_USER_KEY = "@orbit-mesh/current-user";


async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password + "@orbit-mesh-salt-2026");
}




export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userData = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (userData) setUser(JSON.parse(userData));
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users: Array<User & { password: string }> = usersData ? JSON.parse(usersData) : [];
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === await hashPassword(password));
      if (!found) return { success: false, error: "E-posta veya şifre hatalı" };
      const { password: _, ...safeUser } = found;
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
      setUser(safeUser);
      return { success: true };
    } catch {
      return { success: false, error: "Giriş yapılamadı" };
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const usersData = await AsyncStorage.getItem(USERS_KEY);
      const users: Array<User & { password: string }> = usersData ? JSON.parse(usersData) : [];
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: "Bu e-posta zaten kayıtlı" };
      }
      const newUser: User & { password: string } = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name,
        email,
        password: await hashPassword(password),
        quizScore: 0,
        quizAttempts: 0,
        rank: users.length + 1,
        joinedAt: new Date().toISOString(),
        streak: 0,
      };
      users.push(newUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      const { password: _, ...safeUser } = newUser;
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
      setUser(safeUser);
      return { success: true };
    } catch {
      return { success: false, error: "Kayıt oluşturulamadı" };
    }
  }

  async function logout() {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }

  async function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
    const usersData = await AsyncStorage.getItem(USERS_KEY);
    if (usersData) {
      const users: Array<User & { password: string }> = JSON.parse(usersData);
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...updates };
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
