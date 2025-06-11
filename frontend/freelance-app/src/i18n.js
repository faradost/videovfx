import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import translationEN from './locales/en/translation.json';
import translationFA from './locales/fa/translation.json';

// The translations
const resources = {
  en: {
    translation: translationEN,
  },
  fa: {
    translation: translationFA,
  },
};

i18n
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language if current language translation is missing
    debug: process.env.NODE_ENV === 'development', // Enable debug mode in development

    interpolation: {
      escapeValue: false, // React already safes from xss
    },

    // Language detection options (if i18next-browser-languagedetector is used)
    // detection: {
    //   order: ['localStorage', 'navigator', 'htmlTag'],
    //   caches: ['localStorage'],
    // },
  });

export default i18n;
