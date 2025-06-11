import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/dateFormatter'; // Import formatDate
import '../assets/projects.css';

function ProjectsListPage() {
  const { t, i18n } = useTranslation(); // Destructure i18n for language
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get('/projects/');
        setProjects(response.data || []);
      } catch (err) {
        setError(t('errorFetchProjects'));
        console.error('Fetch projects error:', err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const shortenDescription = (description, maxLength = 100) => {
    if (description.length <= maxLength) {
      return description;
    }
    return description.substring(0, maxLength) + '...';
  };

  const getStatusTranslation = (statusKey) => {
    const keyMap = {
      open: 'statusOpen',
      in_progress: 'statusInProgress',
      completed: 'statusCompleted',
      cancelled: 'statusCancelled',
    };
    return t(keyMap[statusKey] || statusKey); // Fallback to statusKey if no mapping
  };

  if (loading) {
    return <div className="loading-message">{t('loadingProjects')}</div>;
  }

  if (error) {
    return <div className="error-message-projects">{error}</div>; // Error already from t()
  }

  if (projects.length === 0) {
    return <div className="loading-message">{t('noProjectsFound')}</div>;
  }

  return (
    <div className="projects-list-container">
      <h2>{t('projectsListPageTitle')}</h2>
      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-item-card">
            <h3>{project.title}</h3> {/* Assuming project title is not translated */}
            <p className="project-description">
              {shortenDescription(project.description)} {/* Project description not translated */}
            </p>
            <p className="project-detail">
              <strong>{t('categoryLabel')}:</strong> {project.category || t('n/a')}
            </p>
            <p className="project-detail">
              <strong>{t('budgetLabel')}:</strong>
              {project.budget_range_min && project.budget_range_max
                ? `$${project.budget_range_min} - $${project.budget_range_max}`
                : t('n/a')} {/* Or a more specific "Not specified" key */}
            </p>
            <p className="project-detail">
              <strong>{t('clientIdLabel')}:</strong> {project.client}
            </p>
            <p className="project-detail">
              <strong>{t('createdDateLabel')}:</strong> {formatDate(project.creation_date, i18n.language)}
            </p>
            <p className="project-detail">
              <strong>{t('statusLabel')}:</strong> <span style={{textTransform: 'capitalize'}}>{getStatusTranslation(project.status)}</span>
            </p>
            <Link to={`/projects/${project.id}`} className="view-details-button">
              {t('viewDetailsButton')}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsListPage;
