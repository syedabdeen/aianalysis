import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVendorCategories } from '@/hooks/useVendors';
import { VendorStatus, VendorType } from '@/types/vendor';
import { Search, X } from 'lucide-react';

interface VendorFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status?: VendorStatus;
  onStatusChange: (value: VendorStatus | undefined) => void;
  vendorType?: VendorType;
  onVendorTypeChange: (value: VendorType | undefined) => void;
  categoryId?: string;
  onCategoryChange: (value: string | undefined) => void;
  onClear: () => void;
}

export function VendorFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  vendorType,
  onVendorTypeChange,
  categoryId,
  onCategoryChange,
  onClear,
}: VendorFiltersProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { data: categories = [] } = useVendorCategories();

  const hasFilters = search || status || vendorType || categoryId;

  const statusOptions: { value: VendorStatus; labelEn: string; labelAr: string }[] = [
    { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' },
    { value: 'approved', labelEn: 'Approved', labelAr: 'معتمد' },
    { value: 'suspended', labelEn: 'Suspended', labelAr: 'موقوف' },
    { value: 'blacklisted', labelEn: 'Blacklisted', labelAr: 'محظور' },
  ];

  const typeOptions: { value: VendorType; labelEn: string; labelAr: string }[] = [
    { value: 'material', labelEn: 'Material', labelAr: 'مواد' },
    { value: 'service', labelEn: 'Service', labelAr: 'خدمات' },
    { value: 'subcontractor', labelEn: 'Subcontractor', labelAr: 'مقاول باطن' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isRTL ? 'البحث عن المورد...' : 'Search vendors...'}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-9"
        />
      </div>

      <Select
        value={status || 'all'}
        onValueChange={(v) => onStatusChange(v === 'all' ? undefined : v as VendorStatus)}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</SelectItem>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {isRTL ? opt.labelAr : opt.labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={vendorType || 'all'}
        onValueChange={(v) => onVendorTypeChange(v === 'all' ? undefined : v as VendorType)}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder={isRTL ? 'النوع' : 'Type'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRTL ? 'جميع الأنواع' : 'All Types'}</SelectItem>
          {typeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {isRTL ? opt.labelAr : opt.labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={categoryId || 'all'}
        onValueChange={(v) => onCategoryChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={isRTL ? 'الفئة' : 'Category'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRTL ? 'جميع الفئات' : 'All Categories'}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {isRTL ? cat.name_ar : cat.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={onClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
