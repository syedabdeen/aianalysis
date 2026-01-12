import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanySettingsForm } from "./CompanySettingsForm";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompanySetupDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete: () => void;
}

export function CompanySetupDialog({ open, onOpenChange, onComplete }: CompanySetupDialogProps) {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange || (() => {})}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {language === "ar" ? "إعداد الشركة مطلوب" : "Company Setup Required"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar"
              ? "يرجى إكمال إعدادات الشركة قبل استخدام التطبيق. هذه المعلومات ستظهر في جميع الوحدات والتقارير."
              : "Please complete your company settings before using the application. This information will appear across all modules and reports."}
          </DialogDescription>
        </DialogHeader>
        <CompanySettingsForm onComplete={onComplete} isModal />
      </DialogContent>
    </Dialog>
  );
}
