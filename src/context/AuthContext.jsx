import { createContext, useContext, useState } from 'react';
import { signOutDrive } from '../utils/drive';

// Hardcoded two-user auth — no backend needed
const USERS = {
  him: { password: 'us2024', displayName: 'Him', avatar: '🌙' },
  susmitha: { password: 'sus2024', displayName: 'Susmitha', avatar: '🌸' },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function login(username, password) {
    const key = username.trim().toLowerCase();
    const u = USERS[key];
    if (!u || u.password !== password) {
      return { success: false, error: 'Wrong username or password' };
    }
    const userData = { username: key, displayName: u.displayName, avatar: u.avatar };
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    return { success: true };
  }

  function logout() {
    try { signOutDrive(); } catch {}
    setUser(null);
    localStorage.removeItem('auth_user');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
