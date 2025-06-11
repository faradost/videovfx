import axios from 'axios';

// Define the base URL for the Django backend API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';

// Create an axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Authorization header can be added here if using token authentication,
    // typically by intercepting requests to add the token.
  },
});

// Interceptor to add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // Or however you store your token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// You can also add an interceptor for responses to handle global errors, e.g., 401 for logout.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, e.g., redirect to login, clear token
      // For now, just log it.
      console.error("Unauthorized access - 401. Potentially redirect to login.");
      // localStorage.removeItem('accessToken');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Example usage (can be in other files like authService.js, projectService.js):
/*
import apiClient from './api';

export const loginUser = (credentials) => {
  return apiClient.post('/token/', credentials); // Django SimpleJWT endpoint
};

export const registerUser = (userData) => {
  return apiClient.post('/register/', userData); // Your registration endpoint
};

export const getProjects = () => {
  return apiClient.get('/projects/');
};
*/
