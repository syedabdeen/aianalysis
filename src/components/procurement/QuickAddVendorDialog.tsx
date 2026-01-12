import React from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface QuickAddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorCreated: (vendorId: string) => void;
}

interface QuickVendorForm {
  company_name_en: string;
  email: string;
  phone?: string;
  category_id?: string;
  country?: string;
}

export const QuickAddVendorDialog: React.FC<QuickAddVendorDialogProps> = ({
  open,
  onOpenChange,
  onVendorCreated,
}) => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm<QuickVendorForm>();

  const { data: categories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('is_active', true);
      return data || [];
    },
  });

  const onSubmit = async (data: QuickVendorForm) => {
    setIsSubmitting(true);
    try {
      // Generate vendor code
      const { data: codeResult, error: codeError } = await supabase
        .rpc('get_next_sequence_code', { _prefix: 'VND' });

      if (codeError) throw codeError;

      const { data: user } = await supabase.auth.getUser();

      // Create vendor
      const { data: vendor, error } = await supabase
        .from('vendors')
        .insert({
          code: codeResult,
          company_name_en: data.company_name_en,
          company_name_ar: data.company_name_en,
          email: data.email,
          phone: data.phone,
          category_id: data.category_id || null,
          country: data.country || 'UAE',
          status: 'pending',
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add category mapping if selected
      if (data.category_id && vendor) {
        await supabase
          .from('vendor_category_mappings')
          .insert({
            vendor_id: vendor.id,
            category_id: data.category_id,
          });
      }

      toast.success(language === 'ar' ? 'تم إضافة المورد بنجاح' : 'Vendor added successfully');
      onVendorCreated(vendor.id);
      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      toast.error(error.message || 'Error creating vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'اسم الشركة' : 'Company Name'} *</Label>
            <Input
              {...register('company_name_en', { required: true })}
              placeholder={language === 'ar' ? 'اسم الشركة' : 'Company name'}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'} *</Label>
            <Input
              type="email"
              {...register('email', { required: true })}
              placeholder="email@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
            <Input
              {...register('phone')}
              placeholder="+971..."
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الفئة' : 'Category'}</Label>
            <Select
              value={watch('category_id') || '_none'}
              onValueChange={(v) => setValue('category_id', v === '_none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{language === 'ar' ? 'بدون' : 'None'}</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {language === 'ar' ? cat.name_ar : cat.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الدولة' : 'Country'}</Label>
            <Select
              value={watch('country') || 'UAE'}
              onValueChange={(v) => setValue('country', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UAE">UAE</SelectItem>
                <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                <SelectItem value="Qatar">Qatar</SelectItem>
                <SelectItem value="Kuwait">Kuwait</SelectItem>
                <SelectItem value="Bahrain">Bahrain</SelectItem>
                <SelectItem value="Oman">Oman</SelectItem>
                <SelectItem value="India">India</SelectItem>
                <SelectItem value="China">China</SelectItem>
                <SelectItem value="USA">USA</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
