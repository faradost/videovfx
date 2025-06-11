import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../services/api'; // Assuming apiClient is set up to handle tokens

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken')); // Load token from localStorage on initial load
  const [loading, setLoading] = useState(true); // To handle initial auth state check

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      // Optionally: verify token with backend and fetch user profile
      // For now, if token exists, we assume it's valid until an API call fails
      // Or, fetch user profile if token exists
      apiClient.get('/users/me/') // Replace with your "get current user" endpoint
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          // Token might be invalid or expired
          localStorage.removeItem('accessToken');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, authToken) => {
    localStorage.setItem('accessToken', authToken);
    setToken(authToken);
    setUser(userData);
    // apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`; // Axios instance might handle this via interceptors
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    // delete apiClient.defaults.headers.common['Authorization']; // Clear auth header
    // Potentially call a backend logout endpoint to invalidate token if using blacklist
    // apiClient.post('/auth/logout/', { refresh: localStorage.getItem('refreshToken') }); // Example
  };

  const isAuthenticated = !!token && !!user; // Or just !!token, depending on your logic

  const value = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    loading // Expose loading state for initial auth check
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Don't render children until initial auth check is done */}
    </AuthContext.Provider>
  );
};
