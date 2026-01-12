import React, { createContext, useContext, ReactNode } from 'react';
import { useCompanySettings, CompanySettings } from '@/hooks/useCompanySettings';

interface CompanyContextValue {
  companySettings: CompanySettings | null;
  isLoading: boolean;
  isSetupComplete: boolean;
  defaultCurrency: string;
  region: string;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { companySettings, isLoading, isSetupComplete } = useCompanySettings();

  const value: CompanyContextValue = {
    companySettings,
    isLoading,
    isSetupComplete,
    defaultCurrency: (companySettings as any)?.default_currency || 'AED',
    region: (companySettings as any)?.region || 'middle_east',
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

// Currency options by region
export const currencyOptions: Record<string, { code: string; name: string; symbol: string }[]> = {
  middle_east: [
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب' },
    { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع' },
  ],
  asia: [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  ],
  europe: [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  ],
  americas: [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  ],
  africa: [
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  ],
};

export const regionOptions = [
  { value: 'middle_east', label: 'Middle East', labelAr: 'الشرق الأوسط' },
  { value: 'asia', label: 'Asia', labelAr: 'آسيا' },
  { value: 'europe', label: 'Europe', labelAr: 'أوروبا' },
  { value: 'americas', label: 'Americas', labelAr: 'الأمريكتان' },
  { value: 'africa', label: 'Africa', labelAr: 'أفريقيا' },
];