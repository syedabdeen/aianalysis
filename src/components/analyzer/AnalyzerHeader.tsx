import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings, Sparkles, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnalyzerHeader() {
  const { language, setLanguage, isRTL } = useLanguage();
  const location = useLocation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-lg -z-10" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight gradient-text-blue">
              AI Analyzer
            </span>
            <span className="text-xs text-muted-foreground">
              {language === 'ar' ? 'أدوات تحليل ذكية' : 'Smart Analysis Tools'}
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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
        </nav>

        <div className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
