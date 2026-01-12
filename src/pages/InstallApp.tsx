import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  Share, 
  Plus, 
  CheckCircle2,
  Apple,
  Wifi,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp: React.FC = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone;
    setIsInstalled(isStandalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const features = [
    {
      icon: Wifi,
      title: language === 'ar' ? 'يعمل بدون إنترنت' : 'Works Offline',
      description: language === 'ar' ? 'الوصول إلى بياناتك في أي وقت' : 'Access your data anytime',
    },
    {
      icon: Zap,
      title: language === 'ar' ? 'سريع وخفيف' : 'Fast & Lightweight',
      description: language === 'ar' ? 'تحميل فوري وأداء سلس' : 'Instant load and smooth performance',
    },
    {
      icon: Shield,
      title: language === 'ar' ? 'آمن ومحمي' : 'Secure & Protected',
      description: language === 'ar' ? 'بياناتك مشفرة ومؤمنة' : 'Your data is encrypted and safe',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-3xl font-bold text-primary-foreground">P</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text-blue">PROCUREMIND AI</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'ar' ? 'منصة المشتريات الذكية' : 'Intelligent Procurement Platform'}
            </p>
          </div>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="glass-card border-green-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-green-400">
                  {language === 'ar' ? 'التطبيق مثبت بالفعل!' : 'App Already Installed!'}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {language === 'ar' 
                    ? 'يمكنك الوصول إلى التطبيق من الشاشة الرئيسية'
                    : 'You can access the app from your home screen'}
                </p>
              </div>
              <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
                {language === 'ar' ? 'فتح التطبيق' : 'Open App'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Button for Android/Chrome */}
            {isInstallable && (
              <Card className="glass-card glow-border">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Download className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">
                        {language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'أضف إلى شاشتك الرئيسية' : 'Add to your home screen'}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleInstall} className="w-full btn-metallic">
                    <Smartphone className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تثبيت الآن' : 'Install Now'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && !isInstallable && (
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Apple className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">
                        {language === 'ar' ? 'تثبيت على iPhone' : 'Install on iPhone'}
                      </h2>
                      <Badge variant="secondary" className="text-xs mt-1">Safari</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {language === 'ar' ? 'اضغط على' : 'Tap the'}
                        </span>
                        <Share className="h-5 w-5 text-primary" />
                        <span className="text-sm">
                          {language === 'ar' ? 'زر المشاركة' : 'Share button'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {language === 'ar' ? 'اختر' : 'Select'}
                        </span>
                        <Plus className="h-5 w-5 text-primary" />
                        <span className="text-sm">
                          {language === 'ar' ? '"إضافة إلى الشاشة الرئيسية"' : '"Add to Home Screen"'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">3</span>
                      </div>
                      <span className="text-sm">
                        {language === 'ar' ? 'اضغط "إضافة" للتأكيد' : 'Tap "Add" to confirm'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions (fallback) */}
            {!isIOS && !isInstallable && (
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">
                        {language === 'ar' ? 'تثبيت التطبيق' : 'Install App'}
                      </h2>
                      <Badge variant="secondary" className="text-xs mt-1">Chrome</Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' 
                      ? 'افتح قائمة المتصفح (⋮) واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"'
                      : 'Open browser menu (⋮) and select "Install app" or "Add to Home screen"'}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Features */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/50"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => window.location.href = '/'}>
            {language === 'ar' ? 'العودة للموقع' : 'Back to Website'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
