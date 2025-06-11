import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from './LanguageSwitcher';
// No longer mocking '../i18n' directly here, will mock useTranslation

// Mock useTranslation from react-i18next
const mockChangeLanguage = jest.fn();
// To satisfy Jest's out-of-scope variable rule for mocks, prefix with 'mock'
let mockCurrentLanguage = 'en';

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: key => key,
    i18n: {
      changeLanguage: mockChangeLanguage,
      get language() { // Use a getter to ensure the latest value of mockCurrentLanguage is used
        return mockCurrentLanguage;
      },
      on: jest.fn(),
      off: jest.fn(),
    },
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
    mockCurrentLanguage = 'en';
    document.documentElement.dir = 'ltr';
  });

  test('renders language switcher buttons', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /فارسی/i })).toBeInTheDocument();
  });

  test('calls i18n.changeLanguage with "en" when English button is clicked', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /english/i }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  test('calls i18n.changeLanguage with "fa" when فارسی button is clicked', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /فارسی/i }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('fa');
  });

  test('disables the button for the currently active language (en)', () => {
    mockCurrentLanguage = 'en';
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: /english/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /فارسی/i })).not.toBeDisabled();
  });

  test('disables the button for the currently active language (fa)', () => {
    mockCurrentLanguage = 'fa';
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: /فارسی/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /english/i })).not.toBeDisabled();
  });

  test('sets initial document direction to ltr when language is en', () => {
    mockCurrentLanguage = 'en';
    render(<LanguageSwitcher />);
    expect(document.documentElement.dir).toBe('ltr');
  });

  test('sets initial document direction to rtl when language is fa', () => {
    mockCurrentLanguage = 'fa';
    render(<LanguageSwitcher />);
    expect(document.documentElement.dir).toBe('rtl');
  });

  test('updates document direction when language changes after click', () => {
    mockCurrentLanguage = 'en';
    const { rerender } = render(<LanguageSwitcher />);
    expect(document.documentElement.dir).toBe('ltr');

    fireEvent.click(screen.getByRole('button', { name: /فارسی/i }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('fa');

    mockCurrentLanguage = 'fa'; // Update the language variable used by the mock
    rerender(<LanguageSwitcher />); // Rerender to apply useEffect with new language
    expect(document.documentElement.dir).toBe('rtl');

    fireEvent.click(screen.getByRole('button', { name: /english/i }));
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');

    mockCurrentLanguage = 'en';
    rerender(<LanguageSwitcher />);
    expect(document.documentElement.dir).toBe('ltr');
  });
});
