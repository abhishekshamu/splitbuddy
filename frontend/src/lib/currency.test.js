/**
 * Unit tests for currency.js
 * Run with: npx jest src/lib/currency.test.js
 */

import {
  CURRENCY_META,
  BASE_CURRENCY,
  FALLBACK_RATES,
  extractCurrencyCode,
  convertCurrency,
  formatCurrency,
  convertAndFormat
} from './currency';

// ── extractCurrencyCode ──────────────────────────────────────────
describe('extractCurrencyCode', () => {
  test('returns USD for currency code strings', () => {
    expect(extractCurrencyCode('USD')).toBe('USD');
    expect(extractCurrencyCode('usd')).toBe('USD');
  });

  test('returns code from full labels', () => {
    expect(extractCurrencyCode('₹ INR')).toBe('INR');
    expect(extractCurrencyCode('$ USD')).toBe('USD');
    expect(extractCurrencyCode('€ EUR')).toBe('EUR');
    expect(extractCurrencyCode('£ GBP')).toBe('GBP');
    expect(extractCurrencyCode('¥ JPY')).toBe('JPY');
    expect(extractCurrencyCode('CA$ CAD')).toBe('CAD');
    expect(extractCurrencyCode('A$ AUD')).toBe('AUD');
    expect(extractCurrencyCode('AED')).toBe('AED');
  });

  test('returns BASE_CURRENCY for unknown input', () => {
    expect(extractCurrencyCode('')).toBe(BASE_CURRENCY);
    expect(extractCurrencyCode(null)).toBe(BASE_CURRENCY);
    expect(extractCurrencyCode('UNKNOWN')).toBe(BASE_CURRENCY);
  });
});

// ── convertCurrency ──────────────────────────────────────────────
describe('convertCurrency', () => {
  const rates = FALLBACK_RATES;

  test('USD to USD returns same value', () => {
    expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100);
  });

  test('USD to INR conversion', () => {
    const result = convertCurrency(100, 'USD', 'INR', rates);
    // 100 * 83.5 = 8350
    expect(result).toBeCloseTo(100 * rates.INR, 0);
  });

  test('INR to USD conversion', () => {
    const result = convertCurrency(8350, 'INR', 'USD', rates);
    // 8350 / 83.5 = 100
    expect(result).toBeCloseTo(100, 0);
  });

  test('EUR to GBP cross-conversion', () => {
    // EUR -> USD -> GBP
    const inUSD = 100 / rates.EUR;
    const inGBP = inUSD * rates.GBP;
    expect(convertCurrency(100, 'EUR', 'GBP', rates)).toBeCloseTo(inGBP, 1);
  });

  test('returns 0 for 0 input', () => {
    expect(convertCurrency(0, 'USD', 'INR', rates)).toBe(0);
  });

  test('handles NaN/null input gracefully', () => {
    expect(convertCurrency(null, 'USD', 'INR', rates)).toBe(0);
    expect(convertCurrency(NaN, 'USD', 'INR', rates)).toBe(0);
  });
});

// ── formatCurrency ───────────────────────────────────────────────
describe('formatCurrency', () => {
  test('formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234');
  });

  test('formats INR correctly with Indian number system', () => {
    const result = formatCurrency(100000, 'INR');
    // Indian format: 1,00,000
    expect(result).toContain('1,00,000');
  });

  test('formats JPY without decimal places', () => {
    const result = formatCurrency(1000, 'JPY');
    expect(result).not.toContain('.');
  });

  test('formats EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR');
    expect(result).toBeTruthy();
  });

  test('handles zero amount', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toBeTruthy();
    expect(result).toContain('0');
  });
});

// ── convertAndFormat ─────────────────────────────────────────────
describe('convertAndFormat', () => {
  test('converts and formats USD to INR', () => {
    const result = convertAndFormat(100, 'INR', FALLBACK_RATES);
    expect(result).toContain('₹');
    expect(result).toBeTruthy();
  });

  test('outputs correct currency symbol for GBP', () => {
    const result = convertAndFormat(50, 'GBP', FALLBACK_RATES);
    expect(result).toContain('£');
  });
});

// ── CURRENCY_META ────────────────────────────────────────────────
describe('CURRENCY_META', () => {
  test('has all 8 required currencies', () => {
    const codes = Object.keys(CURRENCY_META);
    expect(codes).toContain('USD');
    expect(codes).toContain('INR');
    expect(codes).toContain('EUR');
    expect(codes).toContain('GBP');
    expect(codes).toContain('JPY');
    expect(codes).toContain('CAD');
    expect(codes).toContain('AUD');
    expect(codes).toContain('AED');
  });

  test('each currency has required fields', () => {
    Object.values(CURRENCY_META).forEach(meta => {
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('symbol');
      expect(meta).toHaveProperty('code');
      expect(meta).toHaveProperty('locale');
    });
  });
});
