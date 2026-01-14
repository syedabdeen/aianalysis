import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocalCompanySettings } from '@/hooks/useLocalCompanySettings';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { Settings, Sparkles, Languages, FileText, Home, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function AnalyzerHeader() {
  const { language, setLanguage, isRTL } = useLanguage();
  const { settings } = useLocalCompanySettings();
  const { user, userExtended, signOut } = useSimpleAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(language === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error(language === 'ar' ? 'فشل تسجيل الخروج' : 'Failed to logout');
    }
  };

  const hasCompanyName = settings.company_name_en || settings.company_name_ar;
  const displayName = language === 'ar' 
    ? (settings.company_name_ar || settings.company_name_en) 
    : settings.company_name_en;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <Link to="/" className="flex items-center gap-3">
          {/* Logo */}
          {settings.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Company Logo" 
              className="w-10 h-10 rounded-xl object-contain bg-white"
            />
          ) : (
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-lg -z-10" />
            </div>
          )}
          
          {/* Company Name / App Name */}
          <div className="flex flex-col">
            {hasCompanyName ? (
              <>
                <span className="font-bold text-xl tracking-tight">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'محلل الذكاء الاصطناعي' : 'AI Analyzer'}
                </span>
              </>
            ) : (
              <>
                <span className="font-bold text-xl tracking-tight gradient-text-blue">
                  AI Analyzer
                </span>
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'أدوات تحليل ذكية' : 'Smart Analysis Tools'}
                </span>
              </>
            )}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'transition-all gap-1',
                location.pathname === '/' && 'bg-primary/90'
              )}
            >
              <Home className="h-4 w-4" />
              {language === 'ar' ? 'الرئيسية' : 'Home'}
            </Button>
          </Link>
          <Link to="/market-analysis">
            <Button
              variant={location.pathname === '/market-analysis' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'transition-all',
                location.pathname === '/market-analysis' && 'bg-primary/90'
              )}
            >
              {language === 'ar' ? 'تحليل السوق' : 'Market Analysis'}
            </Button>
          </Link>
          <Link to="/offer-analysis">
            <Button
              variant={location.pathname === '/offer-analysis' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'transition-all',
                location.pathname === '/offer-analysis' && 'bg-primary/90'
              )}
            >
              {language === 'ar' ? 'تحليل العروض' : 'Offer Analysis'}
            </Button>
          </Link>
          <Link to="/reports">
            <Button
              variant={location.pathname === '/reports' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'transition-all gap-1',
                location.pathname === '/reports' && 'bg-primary/90'
              )}
            >
              <FileText className="h-4 w-4" />
              {language === 'ar' ? 'التقارير' : 'Reports'}
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* User info */}
          {user && (
            <span className="text-sm text-muted-foreground hidden lg:block max-w-[150px] truncate">
              {userExtended?.username || user.email}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="relative"
          >
            <Languages className="h-4 w-4" />
            <span className="sr-only">Toggle language</span>
          </Button>
          <ThemeToggle />
          <Link to="/settings">
            <Button
              variant={location.pathname === '/settings' ? 'default' : 'ghost'}
              size="icon"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>
          
          {/* Logout button */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title={language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
