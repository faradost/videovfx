import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/dateFormatter'; // Import formatDate
import '../assets/ProfilePage.css';

function ProfilePage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation(); // Destructure i18n for language

  const [clientProjects, setClientProjects] = useState([]);
  const [freelancerBids, setFreelancerBids] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      setLoadingData(true);
      setError('');

      if (user.user_type === 'client') {
        apiClient.get(`/projects/?client_id=${user.id}`)
          .then(response => setClientProjects(response.data || []))
          .catch(err => {
            console.error('Error fetching client projects:', err);
            setError(t('errorFetchProjects')); // Re-use or create specific
          })
          .finally(() => setLoadingData(false));
      } else if (user.user_type === 'freelancer') {
        apiClient.get(`/bids/?freelancer_id=${user.id}`)
          .then(response => setFreelancerBids(response.data || []))
          .catch(err => {
            console.error('Error fetching freelancer bids:', err);
            setError(t('loadingBids')); // Re-use or create specific for bids fetch error
          })
          .finally(() => setLoadingData(false));
      } else {
        setLoadingData(false);
      }
    }
  }, [user, authLoading, isAuthenticated, t]); // Added t to dependency array

  const getStatusTranslation = (statusKey, type = 'project') => { // Copied from ProjectDetailPage
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

  if (authLoading || loadingData) {
    return <div className="loading-profile-section">{t('loadingProfileData')}</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="error-profile-section">{t('loginToViewProfileError')}</div>;
  }

  // formatDate is now imported, this local one can be removed.
  // const formatDate = (dateString) => {
  //   if (!dateString) return t('n/a');
  //   return new Date(dateString).toLocaleDateString();
  // };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>{t('myProfile')}</h2>
      </div>

      <div className="profile-details-card">
        <p><strong>{t('fullNameLabel')}:</strong> {user.full_name || t('n/a')}</p>
        <p><strong>{t('emailLabel')}:</strong> {user.email || t('n/a')}</p>
        <p><strong>{t('usernameLabel')}:</strong> {user.username || t('n/a')}</p>
        <p><strong>{t('userTypeLabel')}:</strong> <span style={{textTransform: 'capitalize'}}>{user.user_type ? t(user.user_type === 'client' ? 'clientType' : 'freelancerType') : t('n/a')}</span></p>

        {user.user_type === 'freelancer' && (
          <>
            <p><strong>{t('bioLabel')}:</strong> <span className="bio-text">{user.bio || t('notSet')}</span></p>
            <p><strong>{t('skillsLabel')}:</strong> <span className="skills-list">{user.skills || t('notSet')}</span></p>
          </>
        )}
      </div>

      {error && <p className="error-profile-section">{error}</p>}

      {user.user_type === 'client' && (
        <section className="profile-section">
          <h3>{t('myProjectsSectionTitle')}</h3>
          {clientProjects.length > 0 ? (
            clientProjects.map(project => (
              <div key={project.id} className="profile-list-item">
                <p><strong>{t('titleLabel')}:</strong> <Link to={`/projects/${project.id}`}>{project.title}</Link></p>
                <p><strong>{t('statusLabel')}:</strong> <span style={{textTransform: 'capitalize'}}>{getStatusTranslation(project.status, 'project')}</span></p>
                <p><strong>{t('createdDateLabel')}:</strong> {formatDate(project.creation_date, i18n.language)}</p>
              </div>
            ))
          ) : (
            <p className="no-data-message">{t('noClientProjectsYet')}</p>
          )}
        </section>
      )}

      {user.user_type === 'freelancer' && (
        <section className="profile-section">
          <h3>{t('myBidsSectionTitle')}</h3>
          {freelancerBids.length > 0 ? (
            freelancerBids.map(bid => (
              <div key={bid.id} className="profile-list-item">
                <p><strong>{t('projectIdLabel')}:</strong> <Link to={`/projects/${bid.project}`}>{bid.project}</Link> ({t('projectTitleNotAvailable')})</p>
                <p><strong>{t('bidAmountLabel')}:</strong> ${bid.bid_amount}</p>
                <p><strong>{t('statusLabel')}:</strong> <span style={{textTransform: 'capitalize'}}>{getStatusTranslation(bid.status, 'bid')}</span></p>
                <p><strong>{t('dateLabel')}:</strong> {formatDate(bid.bid_date, i18n.language)}</p>
              </div>
            ))
          ) : (
            <p className="no-data-message">{t('noFreelancerBidsYet')}</p>
          )}
        </section>
      )}
    </div>
  );
}

export default ProfilePage;
