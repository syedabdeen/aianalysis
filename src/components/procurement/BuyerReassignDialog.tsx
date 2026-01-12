import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';

interface BuyerReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentType: 'rfi' | 'rfq';
  currentBuyerId?: string;
  onReassigned: () => void;
}

export const BuyerReassignDialog: React.FC<BuyerReassignDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentType,
  currentBuyerId,
  onReassigned,
}) => {
  const { language } = useLanguage();
  const [selectedBuyerId, setSelectedBuyerId] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch buyers
  const { data: buyers } = useQuery({
    queryKey: ['buyers-for-reassign'],
    queryFn: async () => {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['buyer', 'manager', 'admin']);

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        return profilesData || [];
      }
      return [];
    },
    enabled: open,
  });

  const handleReassign = async () => {
    if (!selectedBuyerId) {
      toast.error(language === 'ar' ? 'يرجى اختيار المشتري' : 'Please select a buyer');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const tableName = documentType === 'rfi' ? 'rfis' : 'rfqs';

      // Update the document with new buyer
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ assigned_buyer_id: selectedBuyerId })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Create assignment record for audit trail
      const { error: assignError } = await supabase
        .from('document_assignments')
        .insert({
          document_id: documentId,
          document_type: documentType.toUpperCase(),
          assigned_from: user.user?.id,
          assigned_to: selectedBuyerId,
          notes: notes || null,
        });

      if (assignError) throw assignError;

      toast.success(language === 'ar' ? 'تم إعادة التعيين بنجاح' : 'Reassigned successfully');
      onReassigned();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error reassigning:', error);
      toast.error(error.message || 'Error reassigning document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {language === 'ar' ? 'إعادة تعيين المشتري' : 'Reassign Buyer'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar'
              ? 'تعيين هذا المستند إلى مشتري آخر'
              : 'Assign this document to another buyer'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المشتري الجديد' : 'New Buyer'} *</Label>
            <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'ar' ? 'اختر المشتري' : 'Select buyer'} />
              </SelectTrigger>
              <SelectContent>
                {buyers?.filter(b => b.id !== currentBuyerId).map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>
                    {buyer.full_name || buyer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ar' ? 'سبب إعادة التعيين...' : 'Reason for reassignment...'}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleReassign} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {language === 'ar' ? 'تعيين' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
