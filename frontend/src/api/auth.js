import axios from 'axios';

// Base URL for the Express/Node backend API.
// In development, update this or set VITE_API_URL in your .env file
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create configured Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Attach JWT token automatically to every outgoing request if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('xorvest_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ==============================================================================
 * MERN BACKEND INTEGRATION SERVICE FOR XORVEST
 * ==============================================================================
 * Connects Login & Signup to your team's Express / MongoDB backend.
 * Features an intelligent Fallback / Demo Mode: if the backend is not yet running
 * or reachable, it returns simulated responses so you can preview and test
 * the complete user flow without waiting for the backend to be completed!
 */

export const authService = {
  /**
   * Register a new user
   * Expects: { username, email, password }
   * Backend endpoint: POST /api/auth/register
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', {
        username: userData.username.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
      });

      if (response.data?.token) {
        localStorage.setItem('xorvest_token', response.data.token);
        localStorage.setItem('xorvest_user', JSON.stringify(response.data.user || userData));
      }

      return {
        success: true,
        data: response.data,
        isMock: false,
      };
    } catch (error) {
      // Backend not running fallback
      if (
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED'
      ) {
        console.warn(
          '⚠️ Backend server not detected at ' +
            API_BASE_URL +
            '. Running in Demo / Offline mode for preview.'
        );

        await new Promise((resolve) => setTimeout(resolve, 600));

        const mockUser = {
          id: 'user_' + Date.now().toString(36),
          username: userData.username.trim(),
          email: userData.email.trim().toLowerCase(),
          createdAt: new Date().toISOString(),
        };

        const mockToken = 'mock_jwt_xorvest_' + Math.random().toString(36).substring(2);
        localStorage.setItem('xorvest_token', mockToken);
        localStorage.setItem('xorvest_user', JSON.stringify(mockUser));

        return {
          success: true,
          data: {
            message: 'Registration successful (Demo Mode: Backend ready to connect)',
            token: mockToken,
            user: mockUser,
          },
          isMock: true,
        };
      }

      throw new Error(
        error.response?.data?.message || 'Registration failed. Please check your details.'
      );
    }
  },

  /**
   * Log in an existing user
   * Expects: { identifier (username or email), password }
   * Backend endpoint: POST /api/auth/login
   */
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', {
        identifier: credentials.identifier.trim(),
        password: credentials.password,
      });

      if (response.data?.token) {
        localStorage.setItem('xorvest_token', response.data.token);
        localStorage.setItem('xorvest_user', JSON.stringify(response.data.user));
      }

      return {
        success: true,
        data: response.data,
        isMock: false,
      };
    } catch (error) {
      if (
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED'
      ) {
        console.warn(
          '⚠️ Backend server not detected at ' +
            API_BASE_URL +
            '. Running in Demo / Offline mode for preview.'
        );

        await new Promise((resolve) => setTimeout(resolve, 600));

        const isEmail = credentials.identifier.includes('@');
        const mockUser = {
          id: 'usr_verified_99',
          username: isEmail ? credentials.identifier.split('@')[0] : credentials.identifier,
          email: isEmail ? credentials.identifier : `${credentials.identifier}@xorvest.com`,
          createdAt: new Date().toISOString(),
        };

        const mockToken = 'mock_jwt_xorvest_' + Math.random().toString(36).substring(2);
        localStorage.setItem('xorvest_token', mockToken);
        localStorage.setItem('xorvest_user', JSON.stringify(mockUser));

        return {
          success: true,
          data: {
            message: 'Login successful (Demo Mode: Backend ready to connect)',
            token: mockToken,
            user: mockUser,
          },
          isMock: true,
        };
      }

      throw new Error(
        error.response?.data?.message || 'Invalid credentials. Please verify and try again.'
      );
    }
  },

  getStoredUser() {
    try {
      const user = localStorage.getItem('xorvest_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('xorvest_token');
    localStorage.removeItem('xorvest_user');
  },
};

export default authService;
