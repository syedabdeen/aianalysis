import { useState, useEffect } from 'react';

export interface LocalCompanySettings {
  company_name_en: string;
  company_name_ar: string;
  address_en: string;
  address_ar: string;
  trade_license_number: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  default_currency: string;
  region: string;
  country: string;
  city: string;
}

const defaultSettings: LocalCompanySettings = {
  company_name_en: '',
  company_name_ar: '',
  address_en: '',
  address_ar: '',
  trade_license_number: '',
  phone: '',
  email: '',
  website: '',
  logo_url: '',
  default_currency: 'AED',
  region: 'gcc',
  country: 'United Arab Emirates',
  city: '',
};

const STORAGE_KEY = 'ai_analyzer_company_settings';

export function useLocalCompanySettings() {
  const [settings, setSettings] = useState<LocalCompanySettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to parse company settings:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = (newSettings: Partial<LocalCompanySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    settings,
    updateSettings,
    clearSettings,
    isLoaded,
  };
}
