import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings as SettingsIcon, User, Globe, Mail, Send, Building2, Lock, Coins } from 'lucide-react';
import { useEmail } from '@/hooks/useEmail';
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm';
import { PhoneInput } from '@/components/ui/phone-input';
import { ExchangeRatesPanel } from '@/components/settings/ExchangeRatesPanel';
import { UserRoleCard } from '@/components/settings/UserRoleCard';

const Settings: React.FC = () => {
  const { user, profile, role } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { toast } = useToast();
  const { sendEmail } = useEmail();
  const [saving, setSaving] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [activeTab, setActiveTab] = useState('profile');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const isAdmin = role === 'admin';

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          preferred_language: language,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Settings saved successfully',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: t('common.error'),
        description: language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match',
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
        title: t('common.success'),
        description: language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully',
      });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendTestEmail = () => {
    if (!testEmailAddress) {
      toast({
        title: t('common.error'),
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    sendEmail.mutate({
      to: [{ email: testEmailAddress, name: profile?.full_name || 'User' }],
      subject: 'ProcureMind - Test Email',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
            🎉 Email Configuration Successful!
          </h1>
          <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">
            Congratulations! Your ZeptoMail integration is working correctly.
          </p>
          <p style="font-size: 14px; color: #718096;">
            This test email was sent from ProcureMind to verify your email configuration.
          </p>
          <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #4a5568;">
              <strong>Sent to:</strong> ${testEmailAddress}<br/>
              <strong>Time:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #a0aec0; text-align: center;">
            ProcureMind - Enterprise Procurement Management System
          </p>
        </div>
      `,
    });
  };

  return (
    <DashboardLayout>
      <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <PageHeader
          title="Settings"
          titleAr="الإعدادات"
          description="Manage your account settings and preferences"
          descriptionAr="إدارة إعدادات حسابك والتفضيلات"
          icon={SettingsIcon}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2">
              <User className="h-4 w-4" />
              <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-2">
              <Lock className="h-4 w-4" />
              <span>{language === 'ar' ? 'الأمان' : 'Security'}</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2 py-2">
              <Building2 className="h-4 w-4" />
              <span>{language === 'ar' ? 'الشركة' : 'Company'}</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2 py-2">
              <Coins className="h-4 w-4" />
              <span>{language === 'ar' ? 'العملات' : 'Currency'}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2 py-2">
              <Globe className="h-4 w-4" />
              <span>{language === 'ar' ? 'اللغة' : 'Language'}</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2 py-2">
              <Mail className="h-4 w-4" />
              <span>{language === 'ar' ? 'البريد' : 'Email'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-4">
            {/* User Role Card - Show role and request options */}
            <UserRoleCard />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الملف الشخصي' : 'Profile Settings'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'تحديث معلوماتك الشخصية' : 'Update your personal information'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'لا يمكن تغيير البريد الإلكتروني' : 'Email cannot be changed'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t('auth.fullName')}</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder={language === 'ar' ? 'اسمك الكامل' : 'Your full name'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('admin.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'قم بتحديث كلمة المرور الخاصة بك' : 'Update your account password'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    {language === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Settings */}
          <TabsContent value="company" className="space-y-4">
            {isAdmin ? (
              <CompanySettingsForm />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {language === 'ar' ? 'إعدادات الشركة' : 'Company Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' 
                      ? 'فقط المسؤولون يمكنهم تعديل إعدادات الشركة' 
                      : 'Only administrators can modify company settings'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'تواصل مع المسؤول لتعديل إعدادات الشركة' 
                      : 'Contact your administrator to modify company settings'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Currency Settings */}
          <TabsContent value="currency" className="space-y-4">
            <ExchangeRatesPanel />
          </TabsContent>

          {/* Language Settings */}
          <TabsContent value="language" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {language === 'ar' ? 'تفضيلات اللغة' : 'Language Preferences'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' ? 'اختر لغتك المفضلة' : 'Choose your preferred language'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">{t('common.language')}</Label>
                  <Select value={language} onValueChange={(val) => setLanguage(val as 'en' | 'ar')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('admin.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات البريد الإلكتروني' : 'Email Configuration'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'اختبار تكامل البريد الإلكتروني' 
                    : 'Test your email integration'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test_email">
                    {language === 'ar' ? 'عنوان البريد الاختباري' : 'Test Email Address'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="test_email"
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل البريد لاستلام الاختبار' : 'Enter email to receive test'}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendTestEmail} 
                      disabled={sendEmail.isPending}
                      variant="secondary"
                    >
                      {sendEmail.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span className="ml-2">{language === 'ar' ? 'إرسال' : 'Send Test'}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? 'إرسال بريد اختباري للتحقق من صحة الإعدادات' 
                      : 'Send a test email to verify configuration'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;