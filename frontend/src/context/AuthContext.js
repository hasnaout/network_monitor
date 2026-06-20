import { createContext, useContext, useState } from 'react';

export const AuthContext = createContext();
export function AuthProvider({ children }) {

  const [auth, setAuth] = useState(() => ({
    accessToken: localStorage.getItem('access_token') || '',
    refreshToken: localStorage.getItem('refresh_token') || '',
    username: localStorage.getItem('username') || '',
  }));

const login = (data) => {
  if (!data?.accessToken) return;

  const authData = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    username: data.username,
  };

  localStorage.setItem('access_token', authData.accessToken);
  localStorage.setItem('refresh_token', authData.refreshToken);
  localStorage.setItem('username', authData.username);

  setAuth(authData);
};

  const logout = () => {
    localStorage.clear();
    setAuth({ accessToken: '', refreshToken: '', username: '' });
  };

  const isAuthenticated = !!auth.accessToken;

  return (
    <AuthContext.Provider value={{ auth, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
