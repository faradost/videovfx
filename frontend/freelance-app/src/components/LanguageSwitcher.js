import React, { useEffect } from 'react'; // Added useEffect
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const setDirection = (lng) => {
    if (lng === 'fa') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  // Set initial direction on component mount based on current i18n language
  useEffect(() => {
    setDirection(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    // setDirection(lng); // This is now handled by the useEffect listening to i18n.language
  };

  const currentLanguage = i18n.language; // No change here

  return (
    <div className="language-switcher">
      <button
        onClick={() => changeLanguage('en')}
        disabled={currentLanguage === 'en'}
        className={currentLanguage === 'en' ? 'active' : ''}
      >
        English
      </button>
      <button
        onClick={() => changeLanguage('fa')}
        disabled={currentLanguage === 'fa'}
        className={currentLanguage === 'fa' ? 'active' : ''}
      >
        فارسی
      </button>
    </div>
  );
}

export default LanguageSwitcher;
