import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Added Link
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import '../assets/forms.css';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { t } = useTranslation(); // Initialize useTranslation

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('registered') === 'true') {
      setSuccessMessage(t('registrationSuccessMessage'));
    }
  }, [location.search, t]);

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
      setError(t('fillAllFieldsError')); // Example of a more generic message
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
        setError(t('loginFailedError')); // More specific generic failure
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        // Assuming backend sends "No active account found with the given credentials"
        // which can be translated or used as is if it's a key itself.
        // For now, use a generic key if specific backend messages aren't translation keys.
        setError(t('loginFailedError'));
      } else if (err.response && err.response.status === 400) {
         setError(t('fillAllFieldsError')); // Or a more specific 400 error message key
      }
      else {
        setError(t('genericLoginError'));
      }
      console.error('Login error:', err);
    }
  };

  return (
    <div className="form-container">
      <h2>{t('loginPageTitle')}</h2>
      {successMessage && <p className="success-message">{successMessage}</p>}
      <form onSubmit={handleSubmit} className="form" noValidate>
        {error && <div className="form-errors"><p>{error}</p></div>}

        <div className="form-group">
          <label htmlFor="email">{t('emailLabel')}</label>
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
          <label htmlFor="password">{t('passwordLabel')}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="form-button">{t('loginButton')}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/register">{t('dontHaveAccount')}</Link>
      </p>
    </div>
  );
}

export default LoginPage;
