import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VendorForm } from '@/components/vendors/VendorForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2 } from 'lucide-react';

export default function NewVendorPage() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            {isRTL ? 'إضافة مورد جديد' : 'Add New Vendor'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? 'أكمل النموذج لتسجيل مورد جديد' : 'Complete the form to register a new vendor'}
          </p>
        </div>

        <VendorForm />
      </div>
    </DashboardLayout>
  );
}
