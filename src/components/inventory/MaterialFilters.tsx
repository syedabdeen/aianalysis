import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInventoryCategories } from '@/hooks/useInventory';

interface MaterialFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  stockStatus: string;
  onStockStatusChange: (value: string) => void;
}

export function MaterialFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  stockStatus,
  onStockStatusChange,
}: MaterialFiltersProps) {
  const { language } = useLanguage();
  const { data: categories } = useInventoryCategories();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'ar' ? 'بحث في المواد...' : 'Search materials...'}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={categoryId} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={language === 'ar' ? 'كل الفئات' : 'All Categories'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {language === 'ar' ? 'كل الفئات' : 'All Categories'}
          </SelectItem>
          {categories?.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {language === 'ar' ? cat.name_ar : cat.name_en}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={stockStatus} onValueChange={onStockStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={language === 'ar' ? 'حالة المخزون' : 'Stock Status'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {language === 'ar' ? 'الكل' : 'All'}
          </SelectItem>
          <SelectItem value="low">
            {language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}
          </SelectItem>
          <SelectItem value="out">
            {language === 'ar' ? 'نفد المخزون' : 'Out of Stock'}
          </SelectItem>
          <SelectItem value="overstock">
            {language === 'ar' ? 'مخزون زائد' : 'Overstock'}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
