import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import '../assets/projects.css'; // Import project styling

function ProjectsListPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError('');
        // Assuming the backend endpoint for projects is /api/projects/
        // This was set up with ProjectViewSet in the backend
        const response = await apiClient.get('/projects/');
        setProjects(response.data || []); // Ensure projects is always an array
      } catch (err) {
        setError('Failed to fetch projects. Please try again later.');
        console.error('Fetch projects error:', err);
        setProjects([]); // Clear projects on error
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

  if (loading) {
    return <div className="loading-message">Loading projects...</div>;
  }

  if (error) {
    return <div className="error-message-projects">{error}</div>;
  }

  if (projects.length === 0) {
    return <div className="loading-message">No projects found.</div>;
  }

  return (
    <div className="projects-list-container">
      <h2>Available Projects</h2>
      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-item-card">
            <h3>{project.title}</h3>
            <p className="project-description">
              {shortenDescription(project.description)}
            </p>
            <p className="project-detail">
              <strong>Category:</strong> {project.category || 'N/A'}
            </p>
            <p className="project-detail">
              <strong>Budget:</strong>
              {project.budget_range_min && project.budget_range_max
                ? `$${project.budget_range_min} - $${project.budget_range_max}`
                : 'Not specified'}
            </p>
            <p className="project-detail">
              <strong>Client ID:</strong> {project.client}
              {/* Later, this ID could be used to fetch and display client username/name */}
            </p>
            <p className="project-detail">
              <strong>Status:</strong> <span style={{textTransform: 'capitalize'}}>{project.status}</span>
            </p>
             {/* Link to a future single project page */}
            <Link to={`/projects/${project.id}`} className="view-details-button">
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectsListPage;
