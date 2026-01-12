import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVendors } from '@/hooks/useVendors';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VendorRatingDisplay } from '@/components/vendors/VendorRatingDisplay';
import { Loader2, Plus } from 'lucide-react';

interface VendorSelectorProps {
  selectedVendorIds: string[];
  onChange: (vendorIds: string[]) => void;
  singleSelect?: boolean;
  categoryIds?: string[];
  onAddNewVendor?: () => void;
}

export const VendorSelector: React.FC<VendorSelectorProps> = ({
  selectedVendorIds,
  onChange,
  singleSelect = false,
  categoryIds,
  onAddNewVendor,
}) => {
  const { language } = useLanguage();
  // Only pass category filter if there are actual category IDs
  const filters = categoryIds && categoryIds.length > 0 ? { category_ids: categoryIds } : undefined;
  const { data: vendors, isLoading, isError, error, refetch } = useVendors(filters);

  const approvedVendors = vendors?.filter(v => v.status === 'approved') || [];

  const handleToggle = (vendorId: string) => {
    if (singleSelect) {
      onChange([vendorId]);
    } else {
      if (selectedVendorIds.includes(vendorId)) {
        onChange(selectedVendorIds.filter(id => id !== vendorId));
      } else {
        onChange([...selectedVendorIds, vendorId]);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    const message = (error as any)?.message ? String((error as any).message) : '';

    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'تعذر تحميل قائمة الموردين.' : 'Unable to load vendors list.'}
        </p>
        {message ? <p className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="mt-3"
        >
          {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onAddNewVendor && (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onAddNewVendor}>
            <Plus className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'إضافة مورد جديد' : 'Add New Supplier'}
          </Button>
        </div>
      )}
      
      {approvedVendors.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {categoryIds && categoryIds.length > 0 
            ? (language === 'ar' ? 'لا يوجد موردون معتمدون في هذه الفئات' : 'No approved vendors in selected categories')
            : (language === 'ar' ? 'لا يوجد موردون معتمدون' : 'No approved vendors available')
          }
        </div>
      ) : (
        <ScrollArea className="h-[300px] border rounded-lg p-4">
          <div className="space-y-3">
            {approvedVendors.map((vendor) => (
              <div
                key={vendor.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedVendorIds.includes(vendor.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleToggle(vendor.id)}
              >
                <Checkbox
                  checked={selectedVendorIds.includes(vendor.id)}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => handleToggle(vendor.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {language === 'ar' ? vendor.company_name_ar : vendor.company_name_en}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {vendor.code}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{vendor.email}</span>
                    {vendor.rating_score && (
                      <VendorRatingDisplay rating={vendor.rating_score} size="sm" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
