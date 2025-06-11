import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import '../assets/forms.css'; // Import basic form styling

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check for registration success message
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please log in.');
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(''); // Clear error on change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.email || !formData.password) {
      setError('Both email and password are required.');
      return;
    }

    try {
      // The backend SimpleJWT endpoint for tokens is typically /api/token/
      const response = await apiClient.post('/token/', {
        email: formData.email,
        password: formData.password,
      });

      const { access: accessToken, refresh: refreshToken } = response.data;

      if (accessToken) {
        // Store refresh token if your app uses it for token refresh later
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // The AuthContext's login function expects (userData, token)
        // We don't have full userData here, but AuthContext's useEffect
        // will fetch /users/me/ using the new token.
        // So, we can pass null for userData initially or a basic object if available.
        // The key is that the token is set, triggering the user fetch.
        auth.login(null, accessToken); // Pass token, user will be fetched by AuthContext

        navigate('/'); // Navigate to home page or dashboard
      } else {
        setError('Login failed: No token received.');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else if (err.response && err.response.status === 400) {
         setError('Invalid request. Please check your input.');
      }
      else {
        setError('Login failed. Please check your credentials or try again later.');
      }
      console.error('Login error:', err);
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      {successMessage && <p className="success-message">{successMessage}</p>}
      <form onSubmit={handleSubmit} className="form" noValidate>
        {error && <div className="form-errors"><p>{error}</p></div>}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="form-button">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;
