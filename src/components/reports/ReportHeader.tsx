import { format } from "date-fns";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportHeaderProps {
  reportTitle: string;
  reportTitleAr?: string;
  dateRange?: { from: Date; to: Date };
}

export function ReportHeader({ reportTitle, reportTitleAr, dateRange }: ReportHeaderProps) {
  const { companySettings } = useCompanySettings();
  const { language } = useLanguage();

  const companyName = language === "ar" 
    ? companySettings?.company_name_ar || companySettings?.company_name_en 
    : companySettings?.company_name_en;

  const address = language === "ar"
    ? companySettings?.address_ar || companySettings?.address_en
    : companySettings?.address_en;

  return (
    <div className="hidden print:block mb-8 bg-white text-black">
      <div className="flex items-start justify-between border-b pb-4 mb-4">
        {/* Company Logo */}
        <div className="flex items-center gap-4">
          {companySettings?.logo_url && (
            <img 
              src={companySettings.logo_url} 
              alt="Company Logo" 
              className="h-16 w-auto object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{companyName}</h1>
            {address && <p className="text-sm text-muted-foreground">{address}</p>}
            {companySettings?.phone && (
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "هاتف: " : "Tel: "}{companySettings.phone}
              </p>
            )}
          </div>
        </div>

        {/* Company Details */}
        <div className="text-right text-sm">
          {companySettings?.trade_license_number && (
            <p>
              <span className="text-muted-foreground">
                {language === "ar" ? "رخصة تجارية: " : "Trade License: "}
              </span>
              {companySettings.trade_license_number}
            </p>
          )}
          {companySettings?.vat_number && (
            <p>
              <span className="text-muted-foreground">
                {language === "ar" ? "رقم ضريبي: " : "VAT No: "}
              </span>
              {companySettings.vat_number}
            </p>
          )}
          {companySettings?.email && (
            <p>{companySettings.email}</p>
          )}
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold">
          {language === "ar" ? reportTitleAr || reportTitle : reportTitle}
        </h2>
        {dateRange && (
          <p className="text-sm text-muted-foreground">
            {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {language === "ar" ? "تاريخ الطباعة: " : "Print Date: "}
          {format(new Date(), "PPP")}
        </p>
      </div>
    </div>
  );
}
