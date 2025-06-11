import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher'; // Import LanguageSwitcher
import './Header.css';

function Header() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(); // Initialize useTranslation hook

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  if (loading) {
    return (
      <header className="app-header">
        <div className="header-content">
          <h1><Link to="/">{t('appTitle')}</Link></h1>
          <nav>
            <p>Loading...</p>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="app-header">
      <div className="header-content">
          <h1><Link to="/">{t('appTitle')}</Link></h1>
          <div className="header-controls"> {/* Wrapper for nav and language switcher */}
            <nav>
              <ul>
                <li><Link to="/projects">{t('projects')}</Link></li>
                {isAuthenticated ? (
              <>
                  <li><Link to="/profile">{t('myProfile')}</Link></li>
                {user?.user_type === 'client' && (
                    <li><Link to="/projects/create">{t('createProject')}</Link></li>
                )}
                <li>
                  <span className="welcome-message">
                      {t('welcomeMessage').split(' ')[0]} {user?.full_name || user?.username || user?.email || 'User'}!
                      {/* A bit simplistic for "Welcome, User!" might need better handling for full welcome message */}
                  </span>
                </li>
                <li>
                    <button onClick={handleLogout} className="logout-button">{t('logout')}</button>
                </li>
              </>
            ) : (
              <>
                  <li><Link to="/login">{t('login')}</Link></li>
                  <li><Link to="/register">{t('register')}</Link></li>
              </>
            )}
              </ul>
            </nav>
            <LanguageSwitcher />
          </div>
      </div>
    </header>
  );
}

export default Header;
