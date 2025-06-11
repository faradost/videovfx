import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
// No date displayed on this page, only input. Formatter not directly needed for display.
// import { formatDate } from '../utils/dateFormatter';
import '../assets/forms.css';

function CreateProjectPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget_range_min: '',
    budget_range_max: '',
    deadline_date: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    // Redirect if user is not authenticated or not a client after auth check
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login', { state: { from: '/projects/create' } });
      } else if (user?.user_type !== 'client') {
        navigate('/');
        console.warn("Access denied: Only clients can create projects."); // Log remains in English
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]); // t not needed here as messages are console/redirect


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = t('fieldRequiredError', { fieldName: t('titleLabel') });
    if (!formData.description.trim()) newErrors.description = t('fieldRequiredError', { fieldName: t('descriptionLabel') });
    if (formData.budget_range_min && isNaN(parseFloat(formData.budget_range_min))) {
      newErrors.budget_range_min = t('minBudgetNaNError');
    }
    if (formData.budget_range_max && isNaN(parseFloat(formData.budget_range_max))) {
      newErrors.budget_range_max = t('maxBudgetNaNError');
    }
    if (formData.budget_range_min && formData.budget_range_max &&
        parseFloat(formData.budget_range_min) > parseFloat(formData.budget_range_max)) {
      newErrors.budget_range_max = t('maxBudgetLessThanMinError');
    }
    if (formData.deadline_date) {
        const today = new Date(); today.setHours(0,0,0,0);
        const deadline = new Date(formData.deadline_date); // No need to setHours if comparing against today's 00:00
        if (deadline < today) { // Deadline should be today or later
            newErrors.deadline_date = t('deadlinePastError');
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateForm()) return;

    const payload = {
      ...formData,
      budget_range_min: formData.budget_range_min ? parseFloat(formData.budget_range_min) : null,
      budget_range_max: formData.budget_range_max ? parseFloat(formData.budget_range_max) : null,
      deadline_date: formData.deadline_date || null,
      // Client is automatically set by the backend using request.user
    };

    try {
      const response = await apiClient.post('/projects/', payload);
      // Assuming the backend returns the created project with its ID
      const newProjectId = response.data.id;
      navigate(`/projects/${newProjectId}?created=true`); // Redirect to the new project's detail page
    } catch (error) {
      if (error.response && error.response.data) {
        const backendErrors = error.response.data;
        const formattedErrors = {};
        for (const key in backendErrors) {
          formattedErrors[key] = Array.isArray(backendErrors[key]) ? backendErrors[key].join(' ') : backendErrors[key];
        }
        if (formattedErrors.detail) {
          setServerError(formattedErrors.detail);
          delete formattedErrors.detail;
        }
        setErrors(prev => ({ ...prev, ...formattedErrors }));
        if(!Object.keys(formattedErrors).length && !formattedErrors.detail && !serverError) { // Check if serverError already set
             setServerError(t('createProjectFailedError'));
        }
      } else {
        setServerError(t('genericRegistrationError')); // Re-use generic error key
      }
      console.error('Create project error:', error);
    }
  };

  if (authLoading) {
    return <div>{t('loadingUserData')}</div>;
  }
  if (!isAuthenticated || user?.user_type !== 'client') {
    return <div>{t('accessDeniedCreateProject')}</div>;
  }

  return (
    <div className="form-container">
      <h2>{t('createProjectPageTitle')}</h2>
      <form onSubmit={handleSubmit} className="form" noValidate>
        {serverError && <div className="form-errors"><p>{serverError}</p></div>}

        <div className="form-group">
          <label htmlFor="title">{t('titleLabel')}</label>
          <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className={errors.title ? 'form-field-error' : ''} />
          {errors.title && <p className="error-message">{errors.title}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="description">{t('descriptionLabel')}</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="5" className={errors.description ? 'form-field-error' : ''} style={{resize: 'vertical'}} />
          {errors.description && <p className="error-message">{errors.description}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="category">{t('categoryLabel')}</label>
          <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} className={errors.category ? 'form-field-error' : ''} placeholder={t('categoryPlaceholder')} />
          {/* errors.category might be added if specific validation is implemented */}
        </div>

        <div className="form-group">
          <label htmlFor="budget_range_min">{t('minBudgetLabel')}</label>
          <input type="number" id="budget_range_min" name="budget_range_min" value={formData.budget_range_min} onChange={handleChange} min="0" step="0.01" className={errors.budget_range_min ? 'form-field-error' : ''} />
          {errors.budget_range_min && <p className="error-message">{errors.budget_range_min}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="budget_range_max">{t('maxBudgetLabel')}</label>
          <input type="number" id="budget_range_max" name="budget_range_max" value={formData.budget_range_max} onChange={handleChange} min="0" step="0.01" className={errors.budget_range_max ? 'form-field-error' : ''} />
          {errors.budget_range_max && <p className="error-message">{errors.budget_range_max}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="deadline_date">{t('deadlineDateLabel')}</label>
          <input type="date" id="deadline_date" name="deadline_date" value={formData.deadline_date} onChange={handleChange} className={errors.deadline_date ? 'form-field-error' : ''} />
          {errors.deadline_date && <p className="error-message">{errors.deadline_date}</p>}
        </div>

        <button type="submit" className="form-button">{t('createProject')}</button> {/* Used existing key */}
      </form>
    </div>
  );
}

export default CreateProjectPage;
