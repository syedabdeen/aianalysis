import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CompanyHeader } from './CompanyHeader';

interface PageHeaderProps {
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showCompanyHeader?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleAr,
  description,
  descriptionAr,
  icon: Icon,
  actions,
  children,
  showBackButton = true,
  showHomeButton = true,
  showCompanyHeader = false,
}) => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  const displayTitle = language === 'ar' && titleAr ? titleAr : title;
  const displayDescription = language === 'ar' && descriptionAr ? descriptionAr : description;

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="space-y-4 mb-6">
      {showCompanyHeader && <CompanyHeader showFull />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            {showHomeButton && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-border/50 bg-card/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200"
                onClick={() => navigate('/dashboard')}
                title={language === 'ar' ? 'الصفحة الرئيسية' : 'Go to Home'}
                aria-label={language === 'ar' ? 'الصفحة الرئيسية' : 'Go to Home'}
              >
                <Home className="h-4 w-4" />
              </Button>
            )}
            {showBackButton && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-border/50 bg-card/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200"
                onClick={() => navigate(-1)}
                title={language === 'ar' ? 'الصفحة السابقة' : 'Go Back'}
                aria-label={language === 'ar' ? 'الصفحة السابقة' : 'Go Back'}
              >
                <BackIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Title Section */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text-blue">
                {displayTitle}
              </h1>
              {displayDescription && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {displayDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {(actions || children) && (
          <div className="flex items-center gap-2">
            {actions}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
