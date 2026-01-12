import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { VendorSelector } from '@/components/procurement/VendorSelector';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, UserPlus } from 'lucide-react';

interface AddRFQVendorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId: string;
  existingVendorIds?: string[];
}

export const AddRFQVendorsDialog: React.FC<AddRFQVendorsDialogProps> = ({
  open,
  onOpenChange,
  rfqId,
  existingVendorIds = [],
}) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(existingVendorIds);

  useEffect(() => {
    if (!open) return;
    setSelectedVendorIds(existingVendorIds);
  }, [open, existingVendorIds]);

  const existingSet = useMemo(() => new Set(existingVendorIds), [existingVendorIds]);

  const syncVendors = useMutation({
    mutationFn: async (vendorIds: string[]) => {
      const nextSet = new Set(vendorIds);
      const toAdd = vendorIds.filter((id) => !existingSet.has(id));
      const toRemove = existingVendorIds.filter((id) => !nextSet.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('rfq_vendors')
          .delete()
          .eq('rfq_id', rfqId)
          .in('vendor_id', toRemove);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('rfq_vendors')
          .insert(toAdd.map((vendorId) => ({ rfq_id: rfqId, vendor_id: vendorId })));
        if (error) throw error;
      }

      return { added: toAdd.length, removed: toRemove.length, total: vendorIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rfq-vendors', rfqId] });
      toast({
        title: language === 'ar' ? 'تم تحديث الموردين' : 'Vendors updated',
        description:
          language === 'ar'
            ? `تم اختيار ${result.total} مورد(ين).`
            : `${result.total} vendor(s) selected.`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: language === 'ar' ? 'فشل تحديث الموردين' : 'Failed to update vendors',
        description: error?.message || 'Unexpected error',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'اختيار الموردين' : 'Select Vendors'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar'
              ? 'اختر الموردين لإرسال طلب عرض الأسعار إليهم.'
              : 'Choose the vendors you want to send this RFQ to.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <VendorSelector selectedVendorIds={selectedVendorIds} onChange={setSelectedVendorIds} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            type="button"
            onClick={() => syncVendors.mutate(selectedVendorIds)}
            disabled={syncVendors.isPending}
          >
            {syncVendors.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'حفظ الموردين' : 'Save Vendors'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
