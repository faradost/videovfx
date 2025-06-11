import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css'; // Create a simple CSS file for header styling

function Header() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  if (loading) {
    return (
      <header className="app-header">
        <div className="header-content">
          <h1><Link to="/">Freelance Platform</Link></h1>
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
        <h1><Link to="/">Freelance Platform</Link></h1>
        <nav>
          <ul>
            <li><Link to="/projects">Projects</Link></li>
            {isAuthenticated ? (
              <>
                <li><Link to="/profile">My Profile</Link></li>
                {/* Add other authenticated links like "Dashboard", "My Projects" etc. */}
                <li>
                  <span className="welcome-message">
                    Welcome, {user?.full_name || user?.username || user?.email || 'User'}!
                  </span>
                </li>
                <li>
                  <button onClick={handleLogout} className="logout-button">Logout</button>
                </li>
              </>
            ) : (
              <>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
