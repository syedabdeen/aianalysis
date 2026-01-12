import { ReactNode } from 'react';
import { AnalyzerHeader } from './AnalyzerHeader';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnalyzerLayoutProps {
  children: ReactNode;
}

export function AnalyzerLayout({ children }: AnalyzerLayoutProps) {
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <AnalyzerHeader />
      <main className="container mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Analyzer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
