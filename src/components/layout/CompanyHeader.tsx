import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompanyHeaderProps {
  showFull?: boolean;
}

export function CompanyHeader({ showFull = false }: CompanyHeaderProps) {
  const { companySettings, isLoading } = useCompanySettings();
  const { language } = useLanguage();

  // Don't render anything while loading or if no settings
  if (isLoading) return null;
  if (!companySettings) return null;

  const companyName = language === "ar"
    ? companySettings.company_name_ar || companySettings.company_name_en
    : companySettings.company_name_en;

  if (!showFull) {
    return (
      <div className="flex items-center gap-3">
        {companySettings.logo_url && (
          <img
            src={companySettings.logo_url}
            alt="Company Logo"
            className="h-10 w-10 rounded-md object-cover border border-border/50 shadow-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex flex-col">
          <span className="font-extrabold text-base truncate max-w-[250px]">
            {companyName}
          </span>
          {companySettings.trade_license_number && (
            <span className="text-[10px] text-muted-foreground">
              {companySettings.trade_license_number}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 border-b bg-card">
      {companySettings.logo_url ? (
        <img
          src={companySettings.logo_url}
          alt="Company Logo"
          className="h-12 w-auto max-w-[150px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <div className="flex-1 min-w-0">
        <h2 className="font-bold text-lg truncate">{companyName}</h2>
        {companySettings.trade_license_number && (
          <p className="text-xs text-muted-foreground">
            {language === "ar" ? "رخصة: " : "License: "}
            {companySettings.trade_license_number}
          </p>
        )}
      </div>
    </div>
  );
}
