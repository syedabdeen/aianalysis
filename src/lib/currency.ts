// Currency utility functions for multi-currency support

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const currencyOptions: CurrencyOption[] = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', locale: 'ar-SA' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', locale: 'ar-QA' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', locale: 'ar-KW' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', locale: 'ar-BH' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', locale: 'ar-OM' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'en-PK' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', locale: 'ar-EG' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
];

export const getCurrencyOption = (code: string): CurrencyOption | undefined => {
  return currencyOptions.find(c => c.code === code);
};

export const getCurrencySymbol = (code: string): string => {
  const currency = getCurrencyOption(code);
  return currency?.symbol || code;
};

export const formatCurrency = (
  amount: number,
  currencyCode: string = 'AED',
  options?: Intl.NumberFormatOptions
): string => {
  const currency = getCurrencyOption(currencyCode);
  const locale = currency?.locale || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${getCurrencySymbol(currencyCode)} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

export const formatCompactCurrency = (
  amount: number,
  currencyCode: string = 'AED'
): string => {
  const currency = getCurrencyOption(currencyCode);
  const locale = currency?.locale || 'en-US';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(amount);
  } catch {
    // Fallback
    const symbol = getCurrencySymbol(currencyCode);
    if (amount >= 1000000) {
      return `${symbol} ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${symbol} ${(amount / 1000).toFixed(1)}K`;
    }
    return `${symbol} ${amount.toFixed(2)}`;
  }
};

export interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  fetched_at: string;
}

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRate[]
): number | null => {
  if (fromCurrency === toCurrency) return amount;
  
  // Try direct conversion
  const directRate = rates.find(
    r => r.base_currency === fromCurrency && r.target_currency === toCurrency
  );
  if (directRate) {
    return amount * directRate.rate;
  }
  
  // Try reverse conversion
  const reverseRate = rates.find(
    r => r.base_currency === toCurrency && r.target_currency === fromCurrency
  );
  if (reverseRate) {
    return amount / reverseRate.rate;
  }
  
  // Try conversion via USD as intermediary
  const toUSD = rates.find(
    r => r.base_currency === fromCurrency && r.target_currency === 'USD'
  );
  const fromUSD = rates.find(
    r => r.base_currency === 'USD' && r.target_currency === toCurrency
  );
  
  if (toUSD && fromUSD) {
    return amount * toUSD.rate * fromUSD.rate;
  }
  
  return null; // Conversion not possible
};

export const getConversionRate = (
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRate[]
): number | null => {
  if (fromCurrency === toCurrency) return 1;
  
  const directRate = rates.find(
    r => r.base_currency === fromCurrency && r.target_currency === toCurrency
  );
  if (directRate) return directRate.rate;
  
  const reverseRate = rates.find(
    r => r.base_currency === toCurrency && r.target_currency === fromCurrency
  );
  if (reverseRate) return 1 / reverseRate.rate;
  
  return null;
};
