import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VendorForm } from '@/components/vendors/VendorForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVendor, useUpdateVendor } from '@/hooks/useVendors';
import { VendorFormData } from '@/types/vendor';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const { data: vendor, isLoading } = useVendor(id!);
  const updateVendor = useUpdateVendor();

  const handleSubmit = async (data: VendorFormData) => {
    await updateVendor.mutateAsync({
      id: id!,
      company_name_en: data.company_name_en,
      company_name_ar: data.company_name_ar,
      vendor_type: data.vendor_type,
      category_id: data.category_id || null,
      email: data.email,
      phone: data.phone,
      website: data.website,
      trade_license_no: data.trade_license_no,
      trade_license_expiry: data.trade_license_expiry || null,
      tax_registration_no: data.tax_registration_no,
      address_en: data.address_en,
      address_ar: data.address_ar,
      city: data.city,
      country: data.country,
      notes: data.notes,
    } as any);
    navigate(`/vendors/${id}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!vendor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{isRTL ? 'المورد غير موجود' : 'Vendor not found'}</p>
          <Button variant="link" onClick={() => navigate('/vendors')}>
            {isRTL ? 'العودة إلى قائمة الموردين' : 'Back to vendors list'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            {isRTL ? 'تعديل المورد' : 'Edit Vendor'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRTL ? `تعديل بيانات ${vendor.company_name_ar}` : `Edit ${vendor.company_name_en}`}
          </p>
        </div>

        <VendorForm
          initialData={{
            company_name_en: vendor.company_name_en,
            company_name_ar: vendor.company_name_ar,
            vendor_type: vendor.vendor_type,
            category_id: vendor.category_id || undefined,
            email: vendor.email,
            phone: vendor.phone || '',
            website: vendor.website || '',
            trade_license_no: vendor.trade_license_no || '',
            trade_license_expiry: vendor.trade_license_expiry || '',
            tax_registration_no: vendor.tax_registration_no || '',
            address_en: vendor.address_en || '',
            address_ar: vendor.address_ar || '',
            city: vendor.city || '',
            country: vendor.country,
            contacts: vendor.contacts || [],
            bank_details: vendor.bank_details || [],
            notes: vendor.notes || '',
          }}
          onSubmit={handleSubmit}
          isEditing
        />
      </div>
    </DashboardLayout>
  );
}
