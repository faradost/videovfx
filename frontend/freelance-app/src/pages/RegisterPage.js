import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link
import apiClient from '../services/api';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import '../assets/forms.css';

function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(); // Initialize useTranslation
  const [formData, setFormData] = useState({
    username: '', // Required by Django AbstractUser, even if email is login field
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    user_type: 'freelancer', // Default value
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(''); // For general server errors

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setServerError(''); // Clear general server error on any change
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = t('fieldRequiredError', { fieldName: t('usernameLabel') });
    if (!formData.full_name.trim()) newErrors.full_name = t('fieldRequiredError', { fieldName: t('fullNameLabel') });
    if (!formData.email.trim()) {
      newErrors.email = t('fieldRequiredError', { fieldName: t('emailLabel') });
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      // This specific error message "Email is invalid" might need its own translation key
      // For now, let's use a generic one or assume it's part of a backend response if more specific.
      newErrors.email = t('fieldRequiredError', { fieldName: t('emailLabel') }); // Placeholder, ideally a more specific key
    }
    if (!formData.password) newErrors.password = t('fieldRequiredError', { fieldName: t('passwordLabel') });
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = t('passwordsDontMatchError');
    }
    if (!formData.user_type) newErrors.user_type = t('fieldRequiredError', { fieldName: t('userTypeLabel')}); // Or more specific

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(''); // Clear previous server errors
    if (!validateForm()) return;

    try {
      // The backend UserSerializer expects: username, email, password, full_name, user_type
      // It also accepts profile_picture_url, skills, bio, but we are not collecting them here.
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        user_type: formData.user_type,
      };

      await apiClient.post('/register/', payload); // Endpoint defined in backend (api/urls.py -> UserRegistrationView)

      // On successful registration:
      // For now, navigate to login page with a success message (can use state or query params)
      // Later, could implement auto-login by calling auth.login() if API returns token/user data
      navigate('/login?registered=true');

    } catch (error) {
      if (error.response && error.response.data) {
        // Handle DRF validation errors (typically an object with field names as keys)
        const backendErrors = error.response.data;
        if (typeof backendErrors === 'object') {
          // Map backend errors to our form's error state
          const formattedErrors = {};
          for (const key in backendErrors) {
            if (Array.isArray(backendErrors[key])) {
              formattedErrors[key] = backendErrors[key].join(' ');
            } else {
              formattedErrors[key] = backendErrors[key];
            }
          }
          // Handle specific known error keys from backend if they are translation keys
          if (formattedErrors.username && formattedErrors.username.includes("already exists")) {
            setErrors(prev => ({...prev, username: t('usernameExistsError') }));
            delete formattedErrors.username; // Prevent double display
          }
          if (formattedErrors.email && formattedErrors.email.includes("already exists")) {
             setErrors(prev => ({...prev, email: t('emailExistsError') }));
             delete formattedErrors.email;
          }

          if (formattedErrors.detail) {
            setServerError(formattedErrors.detail); // Use backend detail directly if not a key
            delete formattedErrors.detail;
          }
          if (formattedErrors.non_field_errors) {
            setServerError(formattedErrors.non_field_errors.join(' ')); // Join if array
            delete formattedErrors.non_field_errors;
          }
          setErrors(prev => ({...prev, ...formattedErrors})); // Set remaining field errors

          // If no specific field errors were set from backend but there was a general issue
          if (Object.keys(formattedErrors).length === 0 && !serverError) {
             setServerError(t('genericRegistrationError'));
          }

        } else {
          setServerError(t('genericRegistrationError'));
        }
      } else {
        setServerError(t('genericRegistrationError')); // More generic error
        console.error('Registration error:', error);
      }
    }
  };

  return (
    <div className="form-container">
      <h2>{t('registrationPageTitle')}</h2>
      <form onSubmit={handleSubmit} className="form" noValidate>
        {serverError && <div className="form-errors"><p>{serverError}</p></div>}

        <div className="form-group">
          <label htmlFor="username">{t('usernameLabel')}</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={errors.username ? 'form-field-error' : ''}
          />
          {errors.username && <p className="error-message">{errors.username}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="full_name">{t('fullNameLabel')}</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className={errors.full_name ? 'form-field-error' : ''}
          />
          {errors.full_name && <p className="error-message">{errors.full_name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="email">{t('emailLabel')}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'form-field-error' : ''}
          />
          {errors.email && <p className="error-message">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('passwordLabel')}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'form-field-error' : ''}
          />
          {errors.password && <p className="error-message">{errors.password}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="confirm_password">{t('confirmPasswordLabel')}</label>
          <input
            type="password"
            id="confirm_password"
            name="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            className={errors.confirm_password ? 'form-field-error' : ''}
          />
          {errors.confirm_password && <p className="error-message">{errors.confirm_password}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="user_type">{t('userTypeLabel')}</label>
          <select
            id="user_type"
            name="user_type"
            value={formData.user_type}
            onChange={handleChange}
            className={errors.user_type ? 'form-field-error' : ''}
          >
            <option value="freelancer">{t('freelancerType')}</option>
            <option value="client">{t('clientType')}</option>
          </select>
          {errors.user_type && <p className="error-message">{errors.user_type}</p>}
        </div>

        <button type="submit" className="form-button">{t('registerButton')}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/login">{t('alreadyHaveAccount')}</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
