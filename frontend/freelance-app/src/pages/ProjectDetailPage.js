import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext'; // To check if user is client for bid button
import '../assets/projects.css'; // Using the shared projects.css

function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth(); // Get current user to conditionally show "Post Bid" or manage bids

  const [project, setProject] = useState(null);
  const [bids, setBids] = useState([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingBids, setLoadingBids] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoadingProject(true);
        const projectResponse = await apiClient.get(`/projects/${projectId}/`);
        setProject(projectResponse.data);
      } catch (err) {
        setError('Failed to fetch project details.');
        console.error('Fetch project details error:', err);
      } finally {
        setLoadingProject(false);
      }
    };

    const fetchProjectBids = async () => {
      try {
        setLoadingBids(true);
        // Assuming bids can be filtered by project_id using the /api/bids/ endpoint
        const bidsResponse = await apiClient.get(`/bids/?project_id=${projectId}`);
        setBids(bidsResponse.data || []);
      } catch (err) {
        // Not critical if bids fail to load, project can still be viewed
        console.error('Fetch project bids error:', err);
        setBids([]); // Ensure bids is an array
      } finally {
        setLoadingBids(false);
      }
    };

    fetchProjectDetails();
    fetchProjectBids();
  }, [projectId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const canPlaceBid = user && user.user_type === 'freelancer' && project && project.client !== user.id && project.status === 'open';
  // const isProjectClient = user && project && project.client === user.id;


  if (loadingProject) {
    return <div className="loading-message">Loading project details...</div>;
  }

  if (error) {
    return <div className="error-message-projects">{error}</div>;
  }

  if (!project) {
    return <div className="loading-message">Project not found.</div>;
  }

  return (
    <div className="project-detail-container">
      <h2>{project.title}</h2>

      <div className="project-meta-info">
        <p><strong>Category:</strong> {project.category || 'N/A'}</p>
        <p><strong>Status:</strong> <span style={{textTransform: 'capitalize'}}>{project.status}</span></p>
        <p><strong>Budget:</strong>
          {project.budget_range_min && project.budget_range_max
            ? `$${project.budget_range_min} - $${project.budget_range_max}`
            : 'Not specified'}
        </p>
        <p><strong>Created:</strong> {formatDate(project.creation_date)}</p>
        <p><strong>Deadline:</strong> {formatDate(project.deadline_date)}</p>
        <p><strong>Client ID:</strong> {project.client}</p> {/* Replace with client name/details later */}
        {project.selected_freelancer && (
            <p><strong>Selected Freelancer ID:</strong> {project.selected_freelancer}</p>
        )}
      </div>

      <h3>Full Description</h3>
      <div className="project-full-description">
        <p>{project.description || 'No description provided.'}</p>
      </div>

      {/* Placeholder for bid submission form or link */}
      {canPlaceBid && (
        <div style={{margin: "20px 0"}}>
            {/* This would navigate to a bid submission form/modal for this project */}
            <Link to={`/projects/${projectId}/create-bid`} className="view-details-button">Place a Bid</Link>
        </div>
      )}


      <div className="bids-section">
        <h3>Bids Received</h3>
        {loadingBids ? (
          <p>Loading bids...</p>
        ) : bids.length > 0 ? (
          bids.map((bid) => (
            <div key={bid.id} className="bid-item">
              <p><strong>Freelancer ID:</strong> {bid.freelancer}</p> {/* Replace with name later */}
              <p><strong>Amount:</strong> ${bid.bid_amount}</p>
              <p><strong>Proposed on:</strong> {formatDate(bid.bid_date)}</p>
              <p><strong>Status:</strong> <span style={{textTransform: 'capitalize'}}>{bid.status}</span></p>
              <p><strong>Proposal:</strong> {bid.proposal_text.substring(0,150)}...</p>
              {/* TODO: If user is project client, show accept/reject buttons */}
            </div>
          ))
        ) : (
          <p className="no-bids-message">No bids have been placed for this project yet.</p>
        )}
      </div>
    </div>
  );
}

export default ProjectDetailPage;
