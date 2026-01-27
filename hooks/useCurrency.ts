import { useState, useEffect, useCallback } from 'react';
import {
  getCurrency,
  getCurrencyByCode,
  formatCurrency as formatWithSymbol,
  CurrencyCode,
  Currency,
  DEFAULT_CURRENCY,
} from '@/lib/storage';

interface UseCurrencyReturn {
  currency: Currency;
  currencyCode: CurrencyCode;
  /** Formats amount with currency symbol (e.g., "$1,000.00") */
  formatCurrency: (amount: number, decimals?: number) => string;
  /** Formats amount without symbol (e.g., "1,000.00") */
  formatAmount: (amount: number, decimals?: number) => string;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCurrency(): UseCurrencyReturn {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);

  const loadCurrency = useCallback(async () => {
    try {
      const code = await getCurrency();
      setCurrencyCode(code);
    } catch (error) {
      console.error('Error loading currency:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrency();
  }, [loadCurrency]);

  const currency = getCurrencyByCode(currencyCode);

  const formatAmount = useCallback(
    (amount: number, decimals?: number) => {
      // Check if the amount is a whole number
      const isWholeNumber = amount % 1 === 0;
      const decimalPlaces = decimals ?? (isWholeNumber ? 0 : currency.decimals);
      return amount.toLocaleString('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      });
    },
    [currency]
  );

  const formatCurrency = useCallback(
    (amount: number, decimals?: number) => {
      return formatWithSymbol(amount, currency, decimals);
    },
    [currency]
  );

  return {
    currency,
    currencyCode,
    formatCurrency,
    formatAmount,
    loading,
    refresh: loadCurrency,
  };
}
