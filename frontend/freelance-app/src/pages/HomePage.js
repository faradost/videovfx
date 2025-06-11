import React from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation

function HomePage() {
  const { t } = useTranslation(); // Initialize useTranslation hook

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>{t('homePage')}</h2>
      <p>{t('homePageWelcome')}</p>
      {/* Additional content for the home page can go here */}
    </div>
  );
}

export default HomePage;
