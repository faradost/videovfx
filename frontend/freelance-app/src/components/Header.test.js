import { render, screen, fireEvent } from '@testing-library/react';
// import { BrowserRouter as Router } from 'react-router-dom'; // Will be mocked
import { AuthContext } from '../contexts/AuthContext';
import Header from './Header';
import '../i18n';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  // useNavigate: () => jest.fn(), // Temporarily remove to see if it's the cause
}));

// Mock useTranslation
jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: key => {
        const translations = {
            login: "Login",
            register: "Register",
            logout: "Logout",
            projects: "Projects",
            createProject: "Create Project",
            myProfile: "My Profile",
            appTitle: "Freelance Platform",
            welcomeMessage: "Welcome to our platform!" // Added for welcome message consistency
        };
        return translations[key] || key;
    },
    i18n: {
        language: 'en',
        changeLanguage: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    }
  }),
}));

// Mock LanguageSwitcher as its tests are separate
jest.mock('./LanguageSwitcher', () => () => <div>Language Switcher Mock</div>);


const mockAuthContext = (isAuthenticated, user, loading) => ({
  isAuthenticated,
  user,
  token: isAuthenticated ? 'fake-token' : null,
  login: jest.fn(),
  logout: jest.fn(),
  loading
});

describe('Header', () => {
  test('renders Login and Register links when not authenticated and not loading', () => {
    const authContextValue = mockAuthContext(false, null, false);
    render(
      <Router>
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      </Router>
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.getByText('Language Switcher Mock')).toBeInTheDocument();
  });

  test('renders loading state when auth is loading', () => {
    const authContextValue = mockAuthContext(false, null, true);
    render(
      <Router>
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      </Router>
    );
    // The text "Loading..." is part of the loading state in Header.js
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders Projects, My Profile, and Logout links when authenticated as a non-client', () => {
    const user = { id: 1, email: 'test@example.com', full_name: 'Test User', user_type: 'freelancer' };
    const authContextValue = mockAuthContext(true, user, false);
    render(
      <Router>
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      </Router>
    );
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    // Adjusted to match the potentially simplified welcome message from Header.js
    expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Create Project')).not.toBeInTheDocument();
  });

  test('renders Create Project link when authenticated as a client', () => {
    const user = { id: 1, email: 'client@example.com', full_name: 'Client User', user_type: 'client' };
    const authContextValue = mockAuthContext(true, user, false);
    render(
      <Router>
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      </Router>
    );
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  test('calls logout from AuthContext when logout button is clicked', () => {
    const user = { id: 1, email: 'test@example.com', full_name: 'Test User', user_type: 'freelancer' };
    const authContextValue = mockAuthContext(true, user, false);
    render(
      <Router>
        <AuthContext.Provider value={authContextValue}>
          <Header />
        </AuthContext.Provider>
      </Router>
    );
    fireEvent.click(screen.getByText('Logout'));
    expect(authContextValue.logout).toHaveBeenCalledTimes(1);
  });
});
