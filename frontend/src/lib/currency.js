/**
 * SplitBuddy – Centralized Currency & Exchange Rate Service
 * src/lib/currency.js
 *
 * BASE CURRENCY: INR (all database amounts are stored in INR)
 * Rates fetched from open.er-api.com relative to INR.
 */

export const BASE_CURRENCY = 'INR';

export const CURRENCY_META = {
  INR: { label: '₹ INR', symbol: '₹', code: 'INR', locale: 'en-IN', name: 'Indian Rupee' },
  USD: { label: '$ USD', symbol: '$', code: 'USD', locale: 'en-US', name: 'US Dollar' },
  EUR: { label: '€ EUR', symbol: '€', code: 'EUR', locale: 'de-DE', name: 'Euro' },
  GBP: { label: '£ GBP', symbol: '£', code: 'GBP', locale: 'en-GB', name: 'British Pound' },
  JPY: { label: '¥ JPY', symbol: '¥', code: 'JPY', locale: 'ja-JP', name: 'Japanese Yen' },
  CAD: { label: 'CA$ CAD', symbol: 'CA$', code: 'CAD', locale: 'en-CA', name: 'Canadian Dollar' },
  AUD: { label: 'A$ AUD', symbol: 'A$', code: 'AUD', locale: 'en-AU', name: 'Australian Dollar' },
  AED: { label: 'AED', symbol: 'AED', code: 'AED', locale: 'ar-AE', name: 'UAE Dirham' }
};

/**
 * Fallback rates relative to INR (used when API and cache both fail).
 * All rates = how many of that currency per 1 INR.
 */
export const FALLBACK_RATES = {
  INR: 1,
  USD: 0.01198,
  EUR: 0.01103,
  GBP: 0.00944,
  JPY: 1.854,
  CAD: 0.01628,
  AUD: 0.01793,
  AED: 0.04397
};

/** Map of browser locale → currency code for auto-detection */
const LOCALE_TO_CURRENCY = {
  'en-IN': 'INR', 'hi': 'INR', 'hi-IN': 'INR',
  'en-US': 'USD', 'en': 'USD',
  'de': 'EUR', 'de-DE': 'EUR', 'fr': 'EUR', 'fr-FR': 'EUR',
  'it': 'EUR', 'it-IT': 'EUR', 'es': 'EUR', 'es-ES': 'EUR',
  'en-GB': 'GBP',
  'ja': 'JPY', 'ja-JP': 'JPY',
  'en-CA': 'CAD',
  'en-AU': 'AUD',
  'ar-AE': 'AED', 'ar': 'AED'
};

const CACHE_KEY = 'splitbuddy_exchange_rates_inr';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Detect user's preferred currency from browser locale.
 * Falls back to INR if detection fails.
 */
export function detectLocaleCurrency() {
  if (typeof navigator === 'undefined') return 'INR';
  const lang = navigator.language || navigator.languages?.[0] || 'en-IN';
  return LOCALE_TO_CURRENCY[lang] || LOCALE_TO_CURRENCY[lang.split('-')[0]] || 'INR';
}

/**
 * Normalizes any currency input (label, symbol, code) → clean 3-letter code (e.g. 'INR').
 */
export function extractCurrencyCode(input) {
  if (!input) return BASE_CURRENCY;
  const str = String(input).trim();
  if (CURRENCY_META[str.toUpperCase()]) return str.toUpperCase();
  for (const meta of Object.values(CURRENCY_META)) {
    if (meta.label === str || meta.symbol === str) return meta.code;
  }
  const match = str.match(/(INR|USD|EUR|GBP|JPY|CAD|AUD|AED)/i);
  if (match) return match[0].toUpperCase();
  return BASE_CURRENCY;
}

/**
 * Fetch exchange rates relative to INR with 12-hour localStorage caching.
 * Falls back to expired cache → hardcoded FALLBACK_RATES.
 */
export async function getExchangeRates() {
  // 1. Try valid cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.rates?.INR) {
          return cached.rates;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 2. Fetch live rates (base = INR)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.rates) {
      const rates = data.rates;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates }));
        } catch (e) { /* ignore */ }
      }
      return rates;
    }
  } catch (err) {
    console.warn('⚠️ [Currency] Live rate fetch failed. Using cache/fallback.', err.message);
  }

  // 3. Try expired cache
  if (typeof window !== 'undefined') {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.rates) {
          console.warn('ℹ️ [Currency] Using stale rate cache.');
          return cached.rates;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 4. Hardcoded fallback
  console.warn('⚠️ [Currency] Using built-in fallback rates (offline mode).');
  return FALLBACK_RATES;
}

/**
 * Converts an amount from one currency to another using INR-based rates.
 * @param {number} amount - The raw amount (in `fromCurr`)
 * @param {string} fromCurr - Source currency code (default: 'INR')
 * @param {string} toCurr - Target currency code
 * @param {object} rates - Exchange rates (all relative to INR)
 */
export function convertCurrency(amount = 0, fromCurr = 'INR', toCurr = 'INR', rates = FALLBACK_RATES) {
  const num = Number(amount) || 0;
  const fromCode = extractCurrencyCode(fromCurr);
  const toCode = extractCurrencyCode(toCurr);
  if (fromCode === toCode) return num;

  // Convert to INR first, then to target
  const rateFrom = rates[fromCode] ?? FALLBACK_RATES[fromCode] ?? 1;
  const rateTo = rates[toCode] ?? FALLBACK_RATES[toCode] ?? 1;
  const amountInINR = fromCode === 'INR' ? num : num / rateFrom;
  return toCode === 'INR' ? amountInINR : amountInINR * rateTo;
}

/**
 * Formats a monetary value with Intl.NumberFormat.
 * @param {number} amount - Already-converted amount in the target currency
 * @param {string} currencyInput - Target currency code or label
 */
export function formatCurrency(amount = 0, currencyInput = 'INR', options = {}) {
  const code = extractCurrencyCode(currencyInput);
  const meta = CURRENCY_META[code] || CURRENCY_META.INR;
  const val = Number(amount) || 0;
  const fractionDigits = code === 'JPY' ? 0 : 2;

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: options.minimumFractionDigits ?? (val % 1 === 0 ? 0 : fractionDigits),
      maximumFractionDigits: options.maximumFractionDigits ?? fractionDigits,
      ...options
    }).format(val);
  } catch (e) {
    const sym = meta.symbol;
    return `${sym}${val.toFixed(fractionDigits)}`;
  }
}

/**
 * Converts from base (INR) to target currency and formats in one step.
 * This is the primary display function for all monetary values.
 * @param {number} amount - Raw INR amount from database
 * @param {string} targetCurrency - The user's selected display currency code
 * @param {object} rates - Exchange rates (INR-based)
 */
export function convertAndFormat(amount = 0, targetCurrency = 'INR', rates = FALLBACK_RATES) {
  const converted = convertCurrency(amount, BASE_CURRENCY, targetCurrency, rates);
  return formatCurrency(converted, targetCurrency);
}
