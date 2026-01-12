import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type AuthMode = 'login' | 'signup' | 'forgot-password';

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const paramMode = searchParams.get('mode');
    if (paramMode === 'signup') return 'signup';
    if (paramMode === 'forgot-password') return 'forgot-password';
    return 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { user, signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      if (mode === 'login') {
        loginSchema.parse({ email, password });
      } else if (mode === 'signup') {
        signupSchema.parse({ email, password, fullName });
      } else {
        resetSchema.parse({ email });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: t('common.success'),
          description: language === 'ar' 
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
            : 'Password reset link has been sent to your email',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot-password') {
      await handleForgotPassword();
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: t('common.error'),
            description: error.message === 'Invalid login credentials' 
              ? 'Invalid email or password. Please try again.'
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('common.success'),
            description: 'Welcome back!',
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: t('common.error'),
            description: error.message === 'User already registered'
              ? 'This email is already registered. Please login instead.'
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('common.success'),
            description: 'Account created successfully!',
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const getTitle = () => {
    if (mode === 'forgot-password') {
      return language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password';
    }
    return mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle');
  };

  const getDescription = () => {
    if (mode === 'forgot-password') {
      return language === 'ar' 
        ? 'أدخل بريدك الإلكتروني لاستلام رابط إعادة تعيين كلمة المرور'
        : 'Enter your email to receive a password reset link';
    }
    return mode === 'login' ? t('auth.loginSubtitle') : t('auth.signupSubtitle');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="absolute top-4 right-4">
        <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-2">
          <Globe className="h-4 w-4" />
          {language === 'en' ? 'العربية' : 'English'}
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-xl">P</span>
          </div>
          <CardTitle className="text-2xl font-bold">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            {getDescription()}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === 'forgot-password' && resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-foreground">
                  {language === 'ar' 
                    ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.'
                    : 'A password reset link has been sent to your email. Please check your inbox.'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setMode('login');
                  setResetEmailSent(false);
                  setErrors({});
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                {mode !== 'forgot-password' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot-password');
                        setErrors({});
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'forgot-password' 
                    ? (isLoading 
                        ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                        : (language === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link'))
                    : (isLoading 
                        ? (mode === 'login' ? t('auth.loggingIn') : t('auth.signingUp'))
                        : (mode === 'login' ? t('auth.login') : t('auth.signup')))
                  }
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                {mode === 'forgot-password' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrors({});
                    }}
                    className="text-primary hover:underline font-medium flex items-center gap-2 mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
                  </button>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
                    </span>{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'signup' : 'login');
                        setErrors({});
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      {mode === 'login' ? t('auth.signup') : t('auth.login')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
