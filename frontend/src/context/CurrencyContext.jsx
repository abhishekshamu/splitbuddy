"use client";
/**
 * SplitBuddy – Global Currency Context
 * src/lib/CurrencyContext.jsx
 *
 * Wraps the entire app. Every component calls useCurrency() to get:
 *   fm(amount)      → converts INR amount to user's currency + formats it
 *   currencyCode    → e.g. 'USD'
 *   symbol          → e.g. '$'
 *   rates           → live exchange rates (INR-based)
 *   loading         → true while rates are being fetched
 *   setCurrency()   → change + persist user's currency preference
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  CURRENCY_META,
  FALLBACK_RATES,
  BASE_CURRENCY,
  detectLocaleCurrency,
  extractCurrencyCode,
  getExchangeRates,
  convertAndFormat,
  convertCurrency,
  formatCurrency
} from '../lib/currency';

const CurrencyContext = createContext(null);

const LS_KEY = 'splitbuddy_currency';

function getInitialCurrency(user) {
  // 1. User's saved DB preference
  if (user?.settings?.currency) {
    const code = extractCurrencyCode(user.settings.currency);
    if (CURRENCY_META[code]) return code;
  }
  // 2. localStorage fallback
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && CURRENCY_META[saved]) return saved;
  }
  // 3. Browser locale detection
  const detected = detectLocaleCurrency();
  if (CURRENCY_META[detected]) return detected;
  // 4. Default: INR
  return 'INR';
}

export function CurrencyProvider({ children, user }) {
  const [currencyCode, setCurrencyCodeState] = useState(() => getInitialCurrency(user));
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  // Fetch live exchange rates on mount
  useEffect(() => {
    let active = true;
    setLoading(true);
    getExchangeRates().then(liveRates => {
      if (active) {
        setRates(liveRates);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Re-sync when user object changes (e.g. after login or profile update)
  useEffect(() => {
    if (user?.settings?.currency) {
      const code = extractCurrencyCode(user.settings.currency);
      if (CURRENCY_META[code]) {
        setCurrencyCodeState(code);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_KEY, code);
        }
      }
    }
  }, [user?.settings?.currency]);

  /**
   * Change the user's active currency.
   * Persists to localStorage immediately. DB persistence is done by the caller.
   */
  const setCurrency = useCallback((codeOrLabel) => {
    const code = extractCurrencyCode(codeOrLabel);
    if (!CURRENCY_META[code]) return;
    setCurrencyCodeState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, code);
    }
    // Refresh rates in the background after a currency switch
    getExchangeRates().then(setRates).catch(() => {});
  }, []);

  /**
   * fm(amount) — The primary display function.
   * Converts a raw INR amount (from DB) to the user's currency and formats it.
   */
  const fm = useCallback((amount) => {
    return convertAndFormat(amount, currencyCode, rates);
  }, [currencyCode, rates]);

  /**
   * fmFrom(amount, fromCode) — Convert from a non-INR source currency.
   */
  const fmFrom = useCallback((amount, fromCode = 'INR') => {
    const converted = convertCurrency(amount, fromCode, currencyCode, rates);
    return formatCurrency(converted, currencyCode);
  }, [currencyCode, rates]);

  const meta = CURRENCY_META[currencyCode] || CURRENCY_META.INR;

  const value = {
    fm,
    fmFrom,
    setCurrency,
    currencyCode,
    symbol: meta.symbol,
    label: meta.label,
    rates,
    loading,
    CURRENCY_META
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * useCurrency() — The hook every component uses.
 * Returns { fm, currencyCode, symbol, rates, loading, setCurrency }
 */
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Graceful fallback if used outside provider (should not happen in production)
    console.warn('[useCurrency] Used outside CurrencyProvider — using fallback.');
    return {
      fm: (amount) => convertAndFormat(amount, 'INR', FALLBACK_RATES),
      fmFrom: (amount) => convertAndFormat(amount, 'INR', FALLBACK_RATES),
      setCurrency: () => {},
      currencyCode: 'INR',
      symbol: '₹',
      label: '₹ INR',
      rates: FALLBACK_RATES,
      loading: false,
      CURRENCY_META
    };
  }
  return ctx;
}
