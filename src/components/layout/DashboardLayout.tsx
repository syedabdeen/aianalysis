import React, { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrialBanner } from '@/components/trial/TrialBanner';
import { CompanySetupDialog } from '@/components/settings/CompanySetupDialog';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isRTL } = useLanguage();
  const { role } = useAuth();
  const { isSetupComplete, isLoading } = useCompanySettings();
  const [showSetup, setShowSetup] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    // Show setup dialog for admin users if company settings are not complete
    if (!isLoading && !isSetupComplete && isAdmin) {
      setShowSetup(true);
    }
  }, [isSetupComplete, isLoading, isAdmin]);

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <TrialBanner />
          <Header />
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* First-time Company Setup Dialog */}
      <CompanySetupDialog 
        open={showSetup} 
        onOpenChange={setShowSetup}
        onComplete={() => setShowSetup(false)}
      />
    </SidebarProvider>
  );
};