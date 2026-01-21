import { useState, useRef, useEffect } from 'react';
import { AnalyzerLayout } from '@/components/analyzer/AnalyzerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  countries, 
  getCitiesForCountry, 
  getCurrencyForCountry, 
  getRegionForCountry,
  getAllCountryNames 
} from '@/lib/countryData';
import { 
  Building2, 
  Upload, 
  Save, 
  Trash2,
  Image as ImageIcon,
  X,
  Lock,
  Loader2
} from 'lucide-react';

export default function AnalyzerSettings() {
  const { language } = useLanguage();
  const { settings, updateSettings, clearSettings, isLoaded } = useLocalCompanySettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCustomCity, setShowCustomCity] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync form data when settings load
  useEffect(() => {
    if (isLoaded && !hasChanges) {
      setFormData(settings);
      // Check if current city is custom
      const cities = getCitiesForCountry(settings.country);
      setAvailableCities(cities);
      if (settings.city && !cities.includes(settings.city)) {
        setShowCustomCity(true);
      }
    }
  }, [isLoaded, settings, hasChanges]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCountryChange = (countryName: string) => {
    const currency = getCurrencyForCountry(countryName);
    const region = getRegionForCountry(countryName);
    const cities = getCitiesForCountry(countryName);
    
    setFormData(prev => ({
      ...prev,
      country: countryName,
      default_currency: currency?.code || prev.default_currency,
      region: region,
      city: '',
    }));
    setAvailableCities(cities);
    setShowCustomCity(false);
    setHasChanges(true);
  };

  const handleCityChange = (cityValue: string) => {
    if (cityValue === '__other__') {
      setShowCustomCity(true);
      handleChange('city', '');
    } else {
      setShowCustomCity(false);
      handleChange('city', cityValue);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'حجم الملف يجب أن يكون أقل من 2 ميجابايت' : 'File size must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logo_url', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    handleChange('logo_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    updateSettings(formData);
    setHasChanges(false);
    toast({
      title: language === 'ar' ? 'تم الحفظ' : 'Saved',
      description: language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully',
    });
  };

  const handleClear = () => {
    clearSettings();
    const defaultCountry = 'United Arab Emirates';
    const defaultCities = getCitiesForCountry(defaultCountry);
    setFormData({
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
      country: defaultCountry,
      city: '',
    });
    setAvailableCities(defaultCities);
    setShowCustomCity(false);
    setHasChanges(false);
    toast({
      title: language === 'ar' ? 'تم المسح' : 'Cleared',
      description: language === 'ar' ? 'تم مسح جميع الإعدادات' : 'All settings cleared',
    });
  };

  // Get currency display text
  const currencyDisplay = () => {
    const country = countries.find(c => c.name === formData.country);
    if (country) {
      return `${country.currency} - ${country.currencyName}`;
    }
    return formData.default_currency;
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' 
          : 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'كلمتا المرور غير متطابقتين' 
          : 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' 
          ? 'تم تغيير كلمة المرور بنجاح' 
          : 'Password changed successfully',
      });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AnalyzerLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'الإعدادات' : 'Settings'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'قم بتخصيص بيانات شركتك للتقارير' 
                : 'Customize your company details for reports'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'مسح' : 'Clear'}
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'حفظ' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              {language === 'ar' ? 'شعار الشركة' : 'Company Logo'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'قم بتحميل شعار شركتك ليظهر في التقارير' 
                : 'Upload your company logo to appear on reports'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {formData.logo_url ? (
                <div className="relative">
                  <img 
                    src={formData.logo_url} 
                    alt="Company Logo" 
                    className="w-24 h-24 object-contain rounded-lg border border-border bg-muted"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6"
                    onClick={removeLogo}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'تحميل الشعار' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'ar' ? 'الحد الأقصى 2 ميجابايت' : 'Max 2MB, PNG or JPG'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {language === 'ar' ? 'بيانات الشركة' : 'Company Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</Label>
                <Input
                  value={formData.company_name_en}
                  onChange={(e) => handleChange('company_name_en', e.target.value)}
                  placeholder="ABC Company LLC"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</Label>
                <Input
                  value={formData.company_name_ar}
                  onChange={(e) => handleChange('company_name_ar', e.target.value)}
                  placeholder="شركة أ ب ج ذ.م.م"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (إنجليزي)' : 'Address (English)'}</Label>
                <Input
                  value={formData.address_en}
                  onChange={(e) => handleChange('address_en', e.target.value)}
                  placeholder="123 Business Bay, Dubai, UAE"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}</Label>
                <Input
                  value={formData.address_ar}
                  onChange={(e) => handleChange('address_ar', e.target.value)}
                  placeholder="١٢٣ الخليج التجاري، دبي، الإمارات"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم الرخصة التجارية' : 'Trade License Number'}</Label>
                <Input
                  value={formData.trade_license_number}
                  onChange={(e) => handleChange('trade_license_number', e.target.value)}
                  placeholder="TL-123456"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الدولة' : 'Country'}</Label>
                <Select
                  value={formData.country}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الدولة' : 'Select country'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {getAllCountryNames().map((countryName) => (
                      <SelectItem key={countryName} value={countryName}>
                        {countryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المدينة' : 'City'}</Label>
                {showCustomCity ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل اسم المدينة' : 'Enter city name'}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setShowCustomCity(false);
                        handleChange('city', '');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.city}
                    onValueChange={handleCityChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر المدينة' : 'Select city'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                      <SelectItem value="__other__" className="text-muted-foreground border-t">
                        {language === 'ar' ? '— أخرى (إدخال يدوي) —' : '— Other (enter manually) —'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                <Input
                  value={currencyDisplay()}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'يتم تحديدها تلقائياً بناءً على الدولة' : 'Auto-set based on country'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الهاتف' : 'Phone'}</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+971 4 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="www.company.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security - Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {language === 'ar' ? 'الأمان' : 'Security'}
            </CardTitle>
            <CardDescription>
              {language === 'ar' 
                ? 'تغيير كلمة المرور الخاصة بحسابك' 
                : 'Change your account password'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ 
                    ...prev, 
                    newPassword: e.target.value 
                  }))}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'يجب أن تكون 6 أحرف على الأقل' 
                    : 'Must be at least 6 characters'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ 
                    ...prev, 
                    confirmPassword: e.target.value 
                  }))}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={handleChangePassword} 
                disabled={changingPassword || !passwordData.newPassword}
                variant="secondary"
              >
                {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            {language === 'ar' 
              ? 'يتم حفظ جميع الإعدادات محلياً في متصفحك' 
              : 'All settings are saved locally in your browser'}
          </p>
        </div>
      </div>
    </AnalyzerLayout>
  );
}
