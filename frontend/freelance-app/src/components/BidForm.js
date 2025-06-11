import React, { useState } from 'react';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import '../assets/forms.css';

function BidForm({ projectId, onSubmitSuccess }) {
  const { t } = useTranslation(); // Initialize useTranslation
  const [bidAmount, setBidAmount] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user || user.user_type !== 'freelancer') {
      setError(t('onlyFreelancersCanBidError'));
      return;
    }
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError(t('validBidAmountError'));
      return;
    }
    if (!proposalText.trim()) {
      setError(t('proposalTextRequiredError'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        project: projectId, // projectId is expected as an ID by the backend
        bid_amount: parseFloat(bidAmount),
        proposal_text: proposalText,
      };
      await apiClient.post('/bids/', payload);
      setSuccess(t('bidSubmitSuccess'));
      setBidAmount('');
      setProposalText('');
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const backendErrors = err.response.data;
        // Attempt to use translated errors if backend provides keys, or show generic translated error
        let errorMessage = '';
        if (backendErrors.project && Array.isArray(backendErrors.project)) {
          errorMessage = `${t('projectLabel')}: ${backendErrors.project.join(' ')}`;
        } else if (backendErrors.bid_amount && Array.isArray(backendErrors.bid_amount)) {
          errorMessage = `${t('bidAmountLabel')}: ${backendErrors.bid_amount.join(' ')}`;
        } else if (backendErrors.proposal_text && Array.isArray(backendErrors.proposal_text)) {
          errorMessage = `${t('proposalLabel')}: ${backendErrors.proposal_text.join(' ')}`;
        } else if (backendErrors.non_field_errors && Array.isArray(backendErrors.non_field_errors)) {
            errorMessage = backendErrors.non_field_errors.join(' ');
        } else if (backendErrors.detail) {
             errorMessage = backendErrors.detail;
        } else {
          const errorValues = Object.values(backendErrors).flat().join(' ');
          errorMessage = errorValues || t('bidSubmitFailed');
        }
        setError(errorMessage);
      } else {
        setError(t('bidSubmitFailed')); // Generic error
      }
      console.error('Bid submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form bid-form" style={{marginTop: '20px', marginBottom: '20px'}}>
      <h4>{t('placeYourBidTitle')}</h4>
      {error && <div className="form-errors" style={{color: 'red', marginBottom: '10px'}}><p>{error}</p></div>}
      {success && <div className="success-message" style={{color: 'green', marginBottom: '10px'}}><p>{success}</p></div>}

      <div className="form-group">
        <label htmlFor="bidAmount">{t('bidAmountFormLabel')}</label>
        <input
          type="number"
          id="bidAmount"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          min="0.01"
          step="0.01"
          required
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="proposalText">{t('proposalFormLabel')}</label>
        <textarea
          id="proposalText"
          value={proposalText}
          onChange={(e) => setProposalText(e.target.value)}
          rows="5"
          required
          disabled={submitting}
          style={{resize: 'vertical'}}
        />
      </div>

      <button type="submit" className="form-button" disabled={submitting}>
        {submitting ? t('submittingButton') : t('submitButton')}
      </button>
    </form>
  );
}

export default BidForm;
