import { useEffect } from "react";
import { useCompanySettings } from "./useCompanySettings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export function useLicenseExpiryCheck() {
  const { companySettings, checkLicenseExpiry } = useCompanySettings();
  const { user, role } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    // Only check for admin users with company settings
    if (!user || role !== "admin" || !companySettings) return;

    const licenseStatus = checkLicenseExpiry();
    if (!licenseStatus) return;

    // Show toast notification based on license status
    if (licenseStatus.isExpired) {
      toast.error(
        language === "ar" 
          ? "الرخصة التجارية منتهية الصلاحية! يرجى التجديد فوراً."
          : "Trade license has expired! Please renew immediately.",
        {
          duration: 10000,
          id: "license-expired",
        }
      );
    } else if (licenseStatus.isExpiringSoon && licenseStatus.daysUntilExpiry !== undefined) {
      toast.warning(
        language === "ar"
          ? `الرخصة التجارية تنتهي خلال ${licenseStatus.daysUntilExpiry} يوم. يرجى التجديد قريباً.`
          : `Trade license expires in ${licenseStatus.daysUntilExpiry} days. Please renew soon.`,
        {
          duration: 8000,
          id: "license-expiring",
        }
      );
    }
  }, [user, role, companySettings, checkLicenseExpiry, language]);
}
