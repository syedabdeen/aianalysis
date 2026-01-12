import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, FileCheck, Calendar, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface AdoptRFIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdoptRFI: (rfiId: string) => void;
}

export const AdoptRFIDialog: React.FC<AdoptRFIDialogProps> = ({
  open,
  onOpenChange,
  onAdoptRFI,
}) => {
  const { language } = useLanguage();

  // Fetch RFIs assigned to current buyer or unassigned
  const { data: rfis, isLoading } = useQuery({
    queryKey: ['adoptable-rfis'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name_en, name_ar, code),
          cost_center:cost_centers(id, name_en, name_ar, code),
          rfi_items(count)
        `)
        .in('status', ['draft', 'submitted', 'under_review'])
        .or(`assigned_buyer_id.eq.${user.user?.id},assigned_buyer_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const getProcurementTypeLabel = (type: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      material: { en: 'Material', ar: 'مواد' },
      service: { en: 'Service', ar: 'خدمة' },
      subcontract: { en: 'Subcontract', ar: 'مقاولة من الباطن' },
    };
    return language === 'ar' ? labels[type]?.ar : labels[type]?.en;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'اختر طلب معلومات للتحويل' : 'Select RFI to Adopt'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'اختر طلب معلومات لتحويله إلى طلب عرض أسعار'
              : 'Select an RFI to convert into an RFQ'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rfis && rfis.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {rfis.map((rfi) => (
                <div
                  key={rfi.id}
                  className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => onAdoptRFI(rfi.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{rfi.code}</Badge>
                        <Badge variant="secondary">
                          {getProcurementTypeLabel(rfi.procurement_type)}
                        </Badge>
                      </div>
                      <h4 className="font-medium">
                        {language === 'ar' ? rfi.title_ar : rfi.title_en}
                      </h4>
                      {rfi.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {rfi.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {rfi.project && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{rfi.project.code}</span>
                          </div>
                        )}
                        {rfi.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(rfi.due_date), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                        <span>
                          {(rfi.rfi_items as any)?.[0]?.count || 0} {language === 'ar' ? 'عناصر' : 'items'}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <FileCheck className="h-4 w-4 mr-1" />
                      {language === 'ar' ? 'تحويل' : 'Adopt'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' 
              ? 'لا توجد طلبات معلومات متاحة للتحويل'
              : 'No RFIs available to adopt'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
