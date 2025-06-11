import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BidForm from '../components/BidForm';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/dateFormatter'; // Import centralized formatDate
import '../assets/projects.css';

function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user, isAuthenticated, token } = useAuth();
  const { t, i18n } = useTranslation(); // Destructure i18n for language

  const [project, setProject] = useState(null);
  const [bids, setBids] = useState([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingBids, setLoadingBids] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchProjectDetails = useCallback(async () => {
    try {
      setLoadingProject(true);
      setError('');
      const projectResponse = await apiClient.get(`/projects/${projectId}/`);
      setProject(projectResponse.data);
    } catch (err) {
      setError(t('errorFetchProjects'));
      console.error('Fetch project details error:', err);
      setProject(null);
    } finally {
      setLoadingProject(false);
    }
  }, [projectId, t]);

  const fetchProjectBids = useCallback(async () => {
    try {
      setLoadingBids(true);
      const bidsResponse = await apiClient.get(`/bids/?project_id=${projectId}`);
      setBids(bidsResponse.data || []);
    } catch (err) {
      console.error('Fetch project bids error:', err);
      setBids([]);
    } finally {
      setLoadingBids(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (token || !isAuthenticated) {
      fetchProjectDetails();
      fetchProjectBids();
    }
  }, [projectId, fetchProjectDetails, fetchProjectBids, token, isAuthenticated]);

  // Local formatDate removed, using imported one

  const handleBidSuccess = () => {
    fetchProjectBids();
  };

  const hasUserAlreadyBid = user && bids.some(bid => bid.freelancer === user.id);

  const showBidForm = isAuthenticated &&
    user?.user_type === 'freelancer' &&
    project?.status === 'open' &&
    project?.client !== user?.id &&
    !hasUserAlreadyBid;

  const isProjectClient = isAuthenticated && user && project && project.client === user.id;

  const handleAcceptBid = async (bidId) => {
    setActionError('');
    setActionSuccess('');
    if (!isProjectClient) {
      setActionError(t('notAuthorizedAction'));
      return;
    }
    try {
      await apiClient.post(`/bids/${bidId}/accept_bid/`);
      setActionSuccess(t('bidAcceptedSuccess'));
      fetchProjectDetails();
      fetchProjectBids();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || t('acceptBidFailed');
      setActionError(errorMessage);
      console.error('Accept bid error:', err);
    }
  };

  const handleRejectBid = async (bidId) => {
    setActionError('');
    setActionSuccess('');
    if (!isProjectClient) {
      setActionError(t('notAuthorizedAction'));
      return;
    }
    try {
      await apiClient.post(`/bids/${bidId}/reject_bid/`);
      setActionSuccess(t('bidRejectedSuccess'));
      fetchProjectBids();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || t('rejectBidFailed');
      setActionError(errorMessage);
      console.error('Reject bid error:', err);
    }
  };

  const getStatusTranslation = (statusKey, type = 'project') => {
    const projectKeyMap = {
      open: 'statusOpen', in_progress: 'statusInProgress',
      completed: 'statusCompleted', cancelled: 'statusCancelled',
    };
    const bidKeyMap = {
      pending: 'statusPending', accepted: 'statusAccepted', rejected: 'statusRejected',
    };
    const keyMap = type === 'bid' ? bidKeyMap : projectKeyMap;
    return t(keyMap[statusKey] || statusKey);
  };

  if (loadingProject) {
    return <div className="loading-message">{t('loadingProjectDetails')}</div>;
  }

  if (error) {
    return <div className="error-message-projects">{error}</div>;
  }

  if (!project) {
    return <div className="loading-message">{t('projectNotFoundError')}</div>;
  }

  return (
    <div className="project-detail-container">
      <h2>{project.title}</h2>

      <div className="project-meta-info">
        <p><strong>{t('categoryLabel')}:</strong> {project.category || t('n/a')}</p>
        <p><strong>{t('statusLabel')}:</strong> <span style={{ textTransform: 'capitalize' }}>{getStatusTranslation(project.status, 'project')}</span></p>
        <p><strong>{t('budgetLabel')}:</strong>
          {project.budget_range_min && project.budget_range_max
            ? `$${project.budget_range_min} - $${project.budget_range_max}`
            : t('n/a')}
        </p>
        <p><strong>{t('createdDateLabel')}:</strong> {formatDate(project.creation_date, i18n.language)}</p>
        <p><strong>{t('deadlineDateLabel')}:</strong> {formatDate(project.deadline_date, i18n.language)}</p>
        <p><strong>{t('clientIdLabel')}:</strong> {project.client}</p>
        {project.selected_freelancer && (
          <p><strong>{t('freelancerIdLabel')}:</strong> {project.selected_freelancer}</p>
        )}
      </div>

      <h3>{t('fullDescriptionLabel')}</h3>
      <div className="project-full-description">
        <p>{project.description || t('noDescriptionProvided')}</p>
      </div>

      {showBidForm && (
        <BidForm projectId={project.id} onSubmitSuccess={handleBidSuccess} />
      )}

      <div className="bids-section">
        <h3>{t('bidsReceivedLabel')}</h3>
        {actionError && <p className="error-message-projects" style={{ textAlign: 'center' }}>{actionError}</p>}
        {actionSuccess && <p className="success-message" style={{ textAlign: 'center', color: 'green' }}>{actionSuccess}</p>}

        {loadingBids ? (
          <p>{t('loadingBids')}</p>
        ) : bids.length > 0 ? (
          bids.map((bid) => (
            <div key={bid.id} className="bid-item">
              <p><strong>{t('freelancerIdLabel')}:</strong> {bid.freelancer}</p>
              <p><strong>{t('bidAmountLabel')}:</strong> ${bid.bid_amount}</p>
              <p><strong>{t('proposalDateLabel')}:</strong> {formatDate(bid.bid_date, i18n.language)}</p>
              <p><strong>{t('statusLabel')}:</strong> <span style={{ textTransform: 'capitalize' }}>{getStatusTranslation(bid.status, 'bid')}</span></p>
              <p><strong>{t('proposalLabel')}:</strong> {bid.proposal_text ? bid.proposal_text.substring(0, 150) + (bid.proposal_text.length > 150 ? '...' : '') : t('n/a')}</p>

              {isProjectClient && project?.status === 'open' && bid.status === 'pending' && (
                <div className="bid-actions" style={{ marginTop: '10px' }}>
                  <button
                    onClick={() => handleAcceptBid(bid.id)}
                    className="action-button accept"
                    style={{ marginRight: '10px' }}
                  >
                    {t('acceptBidButton')}
                  </button>
                  <button
                    onClick={() => handleRejectBid(bid.id)}
                    className="action-button reject"
                  >
                    {t('rejectBidButton')}
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="no-bids-message">{t('noBidsYet')}</p>
        )}
      </div>
    </div>
  );
}

export default ProjectDetailPage;
