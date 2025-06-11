import moment from 'moment-jalaali'; // moment-jalaali extends moment, so just import this

export const formatDateTime = (dateString, targetLocale = 'en') => {
  if (!dateString) return ''; // Or return a placeholder like 'N/A' from t('n/a') if i18n is used here

  // Ensure the original date string is parsed correctly, assuming ISO 8601 or similar
  const date = moment(dateString);
  if (!date.isValid()) return ''; // Or some error string/placeholder

  if (targetLocale === 'fa') {
    // moment-jalaali specific formatting for Persian (Jalali)
    return date.locale('fa').format('jYYYY/jMM/jDD HH:mm');
  } else {
    // Default to Gregorian with English locale formatting
    return date.locale('en').format('YYYY/MM/DD HH:mm');
  }
};

export const formatDate = (dateString, targetLocale = 'en') => {
  if (!dateString) return ''; // Or t('n/a')

  const date = moment(dateString);
  if (!date.isValid()) return '';

  if (targetLocale === 'fa') {
    return date.locale('fa').format('jYYYY/jMM/jDD');
  } else {
    return date.locale('en').format('YYYY/MM/DD');
  }
};

// It's important that moment.locale() is called on the specific moment instance (date)
// rather than globally on the moment object if you need to switch between locales frequently,
// as global changes can affect other parts of the app or other concurrent operations.
// moment-jalaali's .locale('fa') on an instance correctly switches that instance for jalaali.
// For Gregorian, .locale('en') ensures formatting like month names are English.
// The provided code in the prompt used global moment.locale(), which can be problematic.
// The version above uses instance-specific locale setting: `date.locale(targetLocale).format(...)`
// However, for moment-jalaali, the jalaali calendar system is activated by `moment(dateString).locale('fa')`
// or by using `moment.loadPersian({ dialect: 'persian-modern', usePersianDigits: true });` globally once.
// For simplicity and to ensure jalaali conversion, `moment(dateString).locale('fa')` is good for specific instances.
// The original prompt's global `moment.locale('fa')` might be okay if context switches are not rapid
// or if all dates in a view are expected to be in one locale.
// The revised functions above use instance-specific locale setting before formatting.
// Let's refine for clarity with moment-jalaali:
// For Jalali: moment(dateString).locale('fa').format('jYYYY/jM/jD')
// For Gregorian: moment(dateString).locale('en').format('YYYY/MM/DD')
// The `moment-jalaali` library itself handles the calendar conversion when `jMonth`, `jYear`, etc. tokens are used.
// Setting `.locale('fa')` primarily affects the output of month names if using 'MMMM' etc. and number glyphs for some locales.
// The key is that `moment(dateString)` parses it, then `.format('jYYYY...')` outputs Jalali.
// The `.locale()` calls are more for output localization (month names, digits) if not using purely numeric formats.
// Given numeric formats, the explicit .locale() for 'en' might be less critical but good for consistency.

// Let's stick to the structure that ensures the calendar system is correctly applied for 'fa'
// and standard Gregorian for 'en'. The above code should achieve this.
// Note: moment-jalaali sets global locale by default for jalaali specific formats.
// The provided functions in the prompt are actually okay because `moment-jalaali` overrides
// `moment.locale` to handle jalaali calendar system when 'fa' is set.
// So, the original structure from the prompt is fine for `moment-jalaali`.

// Re-evaluating the prompt's code:
// Yes, `moment.locale('fa')` followed by `moment(dateString).format('jYYYY/jMM/jDD')` is the standard way for moment-jalaali.
// The global locale switch is a characteristic of how moment-jalaali integrates.
// My functions below will follow the prompt's structure for `moment.locale()` calls.
// (Self-correction: The prompt's approach of global locale switching is indeed how moment-jalaali is often used,
// and it's designed to work that way. My instance-specific attempt was overcomplicating it for this library.)

// Corrected functions as per prompt structure and moment-jalaali's typical usage:
// (This is actually what was in the prompt, I'm just confirming its validity after consideration)

/*
import moment from 'moment-jalaali';

export const formatDateTime = (dateString, targetLocale = 'en') => {
  if (!dateString) return '';
  if (targetLocale === 'fa') {
    moment.locale('fa');
    return moment(dateString).format('jYYYY/jMM/jDD HH:mm');
  } else {
    moment.locale('en');
    return moment(dateString).format('YYYY/MM/DD HH:mm');
  }
};

export const formatDate = (dateString, targetLocale = 'en') => {
 if (!dateString) return '';
 if (targetLocale === 'fa') {
   moment.locale('fa');
   return moment(dateString).format('jYYYY/jMM/jDD');
 } else {
   moment.locale('en');
   return moment(dateString).format('YYYY/MM/DD');
 }
};
*/
// The initial functions in the prompt are fine. My self-correction led back to them.
// The functions provided in the prompt are what I will use.This is a special case. The user provided the content of the file in the prompt. I will use that.
