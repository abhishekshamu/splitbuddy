const currencyMeta = {
  INR: { label: '₹ INR', symbol: '₹', code: 'INR', locale: 'en-IN' },
  USD: { label: '$ USD', symbol: '$', code: 'USD', locale: 'en-US' },
  EUR: { label: '€ EUR', symbol: '€', code: 'EUR', locale: 'de-DE' },
  GBP: { label: '£ GBP', symbol: '£', code: 'GBP', locale: 'en-GB' }
};

export const currencyOptions = [
  currencyMeta.INR.label,
  currencyMeta.USD.label,
  currencyMeta.EUR.label,
  currencyMeta.GBP.label
];

export const defaultCurrency = currencyMeta.INR.label;

const normalizeCurrency = (currency = defaultCurrency) => {
  if (!currency) return defaultCurrency;
  const value = String(currency).trim();
  const exactMatch = Object.values(currencyMeta).find(meta => meta.label === value || meta.symbol === value);
  if (exactMatch) return exactMatch.label;
  const codeMatch = (value.match(/(INR|USD|EUR|GBP)/i) || [null])[0]?.toUpperCase();
  if (codeMatch && currencyMeta[codeMatch]) return currencyMeta[codeMatch].label;
  return defaultCurrency;
};

const _getCurrencyMeta = (currency = defaultCurrency) => {
  const label = normalizeCurrency(currency);
  const code = (label.match(/(INR|USD|EUR|GBP)/) || [])[0] || 'INR';
  return currencyMeta[code] || currencyMeta.INR;
};

export const formatMoney = (value = 0, currency = defaultCurrency, options = {}) => {
  const meta = _getCurrencyMeta(currency);
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options
  }).format(amount);
};

export const getCurrencyMeta = (currency = defaultCurrency) => {
  return _getCurrencyMeta(currency);
};

export const normalizeLanguage = (language = 'English') => {
  if (!language) return 'English';
  const normalized = String(language).trim();
  if (/^(hi|hindi)$/i.test(normalized)) return 'Hindi';
  if (/english\s*\/\s*hindi/i.test(normalized) || /^(en[-_]?hi|english ?and ?hindi)$/i.test(normalized)) return 'English / Hindi';
  return 'English';
};

const translations = {
  English: {
    preferences: 'Preferences',
    darkMode: 'Dark Mode',
    notifications: 'Notifications',
    language: 'Language',
    currency: 'Currency',
    upiId: 'UPI ID',
    bankAccount: 'Bank Account',
    comingSoon: 'Coming soon ›',
    changePassword: 'Change Password',
    exportAllData: 'Export All Data',
    deleteAccount: 'Delete Account',
    signOut: 'Sign Out',
    tracked: 'Tracked',
    expenses: 'Expenses',
    groups: 'Groups',
    profile: 'Profile',
    save: 'Save',
    cancel: 'Cancel',
    languageSaved: 'Language preference saved',
    currencySaved: 'Currency preference saved',
    preferencesDescription: 'Preferences, currency, theme'
  },
  Hindi: {
    preferences: 'प्राथमिकताएँ',
    darkMode: 'डार्क मोड',
    notifications: 'सूचनाएँ',
    language: 'भाषा',
    currency: 'मुद्रा',
    upiId: 'UPI आईडी',
    bankAccount: 'बैंक खाता',
    comingSoon: 'जल्द आ रहा है ›',
    changePassword: 'पासवर्ड बदलें',
    exportAllData: 'सारी डेटा निर्यात करें',
    deleteAccount: 'खाता हटाएँ',
    signOut: 'साइन आउट',
    tracked: 'ट्रैक किया गया',
    expenses: 'खर्च',
    groups: 'ग्रुप',
    profile: 'प्रोफ़ाइल',
    save: 'सुरक्षित करें',
    cancel: 'रद्द करें',
    languageSaved: 'भाषा वरीयता सहेजी गई',
    currencySaved: 'मुद्रा वरीयता सहेजी गई',
    preferencesDescription: 'वरीयताएँ, मुद्रा, थीम'
  },
  'English / Hindi': {
    preferences: 'Preferences / प्राथमिकताएँ',
    darkMode: 'Dark Mode / डार्क मोड',
    notifications: 'Notifications / सूचनाएँ',
    language: 'Language / भाषा',
    currency: 'Currency / मुद्रा',
    upiId: 'UPI ID / UPI आईडी',
    bankAccount: 'Bank Account / बैंक खाता',
    comingSoon: 'Coming soon › / जल्द आ रहा है ›',
    changePassword: 'Change Password / पासवर्ड बदलें',
    exportAllData: 'Export All Data / सारी डेटा निर्यात करें',
    deleteAccount: 'Delete Account / खाता हटाएँ',
    signOut: 'Sign Out / साइन आउट',
    tracked: 'Tracked / ट्रैक किया गया',
    expenses: 'Expenses / खर्च',
    groups: 'Groups / ग्रुप',
    profile: 'Profile / प्रोफ़ाइल',
    save: 'Save / सुरक्षित करें',
    cancel: 'Cancel / रद्द करें',
    languageSaved: 'Language preference saved / भाषा वरीयता सहेजी गई',
    currencySaved: 'Currency preference saved / मुद्रा वरीयता सहेजी गई',
    preferencesDescription: 'Preferences, currency, theme / वरीयताएँ, मुद्रा, थीम'
  }
};

export const translate = (key, language = 'English') => {
  return translations[language]?.[key] || translations.English[key] || key;
};

export const translatePageTitle = (page, language = 'English') => {
  const base = {
    dashboard: 'Dashboard',
    groups: 'My Groups',
    groupdetail: 'Group Detail',
    expenses: 'All Expenses',
    settle: 'Settle Up',
    reports: 'Insights',
    utilities: 'Room Utilities',
    ai: 'AI Assistant',
    settings: 'Settings',
    more: 'More',
    profile: 'My Profile'
  };

  const hindi = {
    dashboard: 'डैशबोर्ड',
    groups: 'मेरे ग्रुप',
    groupdetail: 'ग्रुप विवरण',
    expenses: 'सारे खर्च',
    settle: 'निपटान',
    reports: 'इनसाइट्स',
    utilities: 'रूम उपयोगिताएँ',
    ai: 'एआई सहायक',
    settings: 'सेटिंग्स',
    more: 'और',
    profile: 'मेरी प्रोफ़ाइल'
  };

  const englishHindi = Object.fromEntries(Object.keys(base).map(k => [`${k}`, `${base[k]} / ${hindi[k]}`]));

  if (language === 'Hindi') return hindi[page] || base[page] || page;
  if (language === 'English / Hindi') return englishHindi[page] || base[page] || page;
  return base[page] || page;
};

export { normalizeCurrency };
